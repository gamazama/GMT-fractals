/**
 * Guard: the Stops editor's RAMP MODE and the render-only readers of a RAMP gradient (ADR-0122).
 *
 *   [1] affordances — on a ramp value the editor offers no knots, no knot insertion, no selection
 *       marquee, no knot edits (handle / drop / keyboard), no clipboard, no blend chooser, and
 *       Add stops only when a host can run it; a stop value gets exactly what it always had
 *       (`knotsStale` still hides knots and insertion, and nothing else).
 *   [2] emit — an edit that leaves no stops on a ramp value keeps the ramp (the output-space
 *       toggle used to emit `{ stops: [] }` with no ramp: a config of neither form).
 *   [3] the bar — a period-2 zebra (the 8ZEBBOW2 shape) paints its texels in strip chrome (6 px
 *       runs) and full chrome (256 texels); a ramp `previewConfig` paints its texels; the host's
 *       `previewRamp` still wins; a STOP value paints byte-identically to the pre-ramp-mode code.
 *   [4] the menu — on a ramp: Add Stops heads Actions, Invert reverses the texels through
 *       `setConfig` (never `emit`), the output space keeps the ramp, every stop-only item is
 *       disabled; on stops: nothing disabled that was enabled, and Invert still emits stops; with
 *       a host tool holding the strip (`takenOver`, GE v2's Paint face): Add Stops stays, and the
 *       actions that rewrite the stops are off with the reason as their title.
 *   [5] `reverseRampGradient` / `sameGradientBody` — the pure helpers the menu and the GE v2
 *       hero's "is the image still the gradient" check lean on.
 *   [6] WIRING PIN (text, not behaviour): the editor's JSX actually reads the rules above — the
 *       track press, the knot layer, the marquee gate, the bar source, the emit and the ramp
 *       guards on the imperative handle; `registerPaletteUI` fills the fitter slot. A text pin is
 *       the honest ceiling for a React file in a repo with no mount infrastructure: it goes red if
 *       a gate is removed or renamed, not if one is subtly mis-wired. The browser is the rest.
 *   [7] READER SCAN (static): no UI file under palette/components, gradient-explorer, app-gmt,
 *       engine-gmt/components, fluid-toy or components walks `<x>.stops` into
 *       `renderStopsToRamp(` / `renderStopsToBuffer(` — the shape that drew a ramp gradient grey.
 *
 * Run: `npm run test:gradient-rampmode` (also a link of `test:palette`).
 *
 * ── FALSIFIED 2026-09-14 (each reverted) ─────────────────────────────────
 *   editorAffordances `knots: !o.knotsStale` (ramp ignored)           → [1] red "ramp: no knots, no insertion, no marquee".
 *   editorEmitConfig always `{ stops, colorSpace, blendSpace }`       → [2] red "an output-space emit on a ramp keeps the ramp".
 *   editorBarSource without the ramp-form branch                      → [3] red on strip + full chrome + previewConfig (3 lines).
 *   gradientActions Invert back to `emit(stopOps.invert(knots))`      → [4] red ×2 ("Invert on a ramp reverses the
 *     texels", and "the output space keeps the ramp" — its never-emit count sees the stray emit).
 *   gradientActions blend items without `disabled`                    → [4] red "ramp: stop-only items disabled".
 *   sameGradientBody comparing stops only                             → [5] red "two different ramps differ".
 *   editor track back to `onPointerDown={knotsStale ? undefined : handleTrackPointerDown}` → [6] red.
 *   FavientsPanel back to `renderStopsToRamp(fav.config.stops, …)`    → [7] red naming the file and line.
 * ── 2026-09-25 ──
 *   gradientActions `offer` never set                                 → [4] red ×2 (the two "offerStops … ask" lines).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  editorAffordances, editorEmitConfig, editorBarSource, paintStripPixels, barTexels256,
  reverseRampGradient, sameGradientBody, rampOfEditorValue, type RampConfig,
} from '../components/gradient/rampMode';
import { buildGradientMenu, type GradientMenuContext } from '../components/gradient/gradientActions';
import { makeRampGradient, decodeRamp } from '../utils/gradientRamp';
import { renderStopsToRamp, sampleSortedStops } from '../utils/colorUtils';
import type { ContextMenuItem } from '../types/help';
import type { GradientConfig, GradientStop } from '../types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

type RGB = { r: number; g: number; b: number };
const zebra: RGB[] = Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 250, g: 240, b: 30 } : { r: 0, g: 0, b: 0 }));
const zebraCfg = makeRampGradient(zebra, 'linear') as RampConfig;
const stops: GradientStop[] = [
  { id: 'a', position: 0, color: '#FF0000', bias: 0.5, interpolation: 'linear' },
  { id: 'b', position: 0.3, color: '#00FF00', bias: 0.4, interpolation: 'smooth' },
  { id: 'c', position: 0.7, color: '#0000FF', bias: 0.5, interpolation: 'step' },
  { id: 'd', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
];
const stopCfg: GradientConfig = { stops, colorSpace: 'srgb', blendSpace: 'oklab' };

console.log('[1] affordances');
{
  const r = editorAffordances({ isRamp: true, knotsStale: false, canAddStops: true });
  check(!r.knots && !r.addKnot && !r.selectMarquee && !r.knotEdits, 'ramp: no knots, no insertion, no marquee');
  check(!r.clipboard && !r.blendSpace && !r.stopActions && r.addStops, 'ramp: no clipboard / blend / stop actions; Add stops offered');
  check(!editorAffordances({ isRamp: true, knotsStale: false, canAddStops: false }).addStops, 'ramp with no fitter and no host action: no Add stops');
  const s = editorAffordances({ isRamp: false, knotsStale: false, canAddStops: true });
  check(s.knots && s.addKnot && s.selectMarquee && s.knotEdits && s.clipboard && s.blendSpace && s.stopActions && !s.addStops, 'stops: everything as before, no Add stops');
  const st = editorAffordances({ isRamp: false, knotsStale: true, canAddStops: true });
  check(!st.knots && !st.addKnot && st.selectMarquee && st.knotEdits && st.blendSpace, 'stale stops: only knots + insertion hide (the pre-ADR rule)');
  // a host tool holding the strip (GE v2's Paint face, 2026-09-24): every knot gesture stands down,
  // and so do the menu's stop actions (2026-09-25); copy and the blend space stay
  const tk = editorAffordances({ isRamp: false, knotsStale: false, canAddStops: true, takenOver: true });
  check(!tk.knots && !tk.addKnot && !tk.selectMarquee && !tk.knotEdits && !tk.stopActions && tk.clipboard && tk.blendSpace, 'taken over: no knots, insertion, marquee, knot edits or stop actions; copy and the blend space stay');
  check(rampOfEditorValue(zebraCfg) === zebraCfg && rampOfEditorValue(stopCfg) === null && rampOfEditorValue(stops) === null && rampOfEditorValue({ stops: [] } as GradientConfig) === null,
    'the mode is read off the value: ramp config yes; stops, legacy array, `stops: []` without a ramp no');
}

console.log('\n[2] emit');
{
  const out = editorEmitConfig([], 'aces_inverse', 'oklab', zebraCfg);
  check(out.ramp === zebraCfg.ramp && out.stops.length === 0 && out.colorSpace === 'aces_inverse', 'an output-space emit on a ramp keeps the ramp');
  const withStops = editorEmitConfig(stops, 'srgb', 'rgb', zebraCfg);
  check(withStops.stops === stops && !('ramp' in withStops), 'an emit WITH stops is a stop gradient, no ramp riding along');
  const plain = editorEmitConfig(stops, 'linear', 'oklch', null);
  check(JSON.stringify(plain) === JSON.stringify({ stops, colorSpace: 'linear', blendSpace: 'oklch' }), 'a stop value emits exactly the pre-ramp-mode object');
}

console.log('\n[3] the bar');
{
  const W = 1536;
  const src = editorBarSource({ value: zebraCfg, knots: [] });
  const px = paintStripPixels(W, src, 'oklab');
  let exact = true;
  for (let x = 0; x < W; x++) {
    const t = zebra[Math.floor((x * 256) / W)];
    if (px[x * 4] !== t.r || px[x * 4 + 1] !== t.g || px[x * 4 + 2] !== t.b || px[x * 4 + 3] !== 255) { exact = false; break; }
  }
  check(exact && px[0] !== px[6 * 4], 'strip chrome paints the zebra\'s texels (6 px runs, not black)');
  const tex = barTexels256(src, 'oklab');
  const grey = renderStopsToRamp([]);
  check(tex.every((c, i) => c.r === zebra[i].r && c.g === zebra[i].g && c.b === zebra[i].b) && tex.some((c, i) => c.r !== grey[i].r),
    'full chrome paints the zebra\'s 256 texels (not the greyscale fallback)');
  const viaPreview = editorBarSource({ previewConfig: zebraCfg, value: stopCfg, knots: stops });
  check(viaPreview.kind === 'ramp' && viaPreview.texels[1].r === 250, 'a ramp previewConfig over a stop value paints its texels');
  const pr: RGB[] = Array.from({ length: 256 }, () => ({ r: 9, g: 9, b: 9 }));
  const hostWins = editorBarSource({ previewRamp: pr, value: zebraCfg, knots: [] });
  check(hostWins.kind === 'ramp' && hostWins.texels === pr, 'the host previewRamp still wins');
  // A stop value: byte-identical to the loop the editor had before ramp mode.
  const sSrc = editorBarSource({ value: stopCfg, knots: stops });
  const sPx = paintStripPixels(W, sSrc, 'oklab');
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  let same = sSrc.kind === 'stops' && sSrc.stops === stops;
  for (let x = 0; x < W && same; x++) {
    const c = sampleSortedStops(sorted, x / (W - 1), 'oklab', 'srgb');
    const e = new Uint8ClampedArray([c.r, c.g, c.b]);
    if (sPx[x * 4] !== e[0] || sPx[x * 4 + 1] !== e[1] || sPx[x * 4 + 2] !== e[2]) same = false;
  }
  check(same, 'stop value: strip pixels identical to the pre-ramp-mode sampler loop');
  const sTex = barTexels256(sSrc, 'rgb');
  const ref = renderStopsToRamp(stops, 'rgb');
  check(sTex.every((c, i) => c.r === ref[i].r && c.g === ref[i].g && c.b === ref[i].b), 'stop value: full chrome identical to renderStopsToRamp');
  const staleStops: GradientConfig = { stops: stops.slice(0, 2), colorSpace: 'srgb', blendSpace: 'oklab' };
  const sp = editorBarSource({ previewConfig: staleStops, value: stopCfg, knots: stops });
  check(sp.kind === 'stops' && sp.stops === staleStops.stops, 'a stop previewConfig still paints its stops');
}

console.log('\n[4] the menu');
const menuFor = (config: GradientConfig, knots: GradientStop[], sel: string[], addStops?: () => void, takenOver?: boolean, offerStops?: () => void) => {
  const calls = { emit: 0, setConfig: [] as GradientConfig[] };
  const ctx: GradientMenuContext = {
    knots, config, selectedIds: new Set(sel), blendSpace: config.blendSpace ?? 'oklab', colorSpace: config.colorSpace ?? 'srgb',
    isBiasHandlesVisible: true,
    emit: () => { calls.emit++; },
    setConfig: (c) => { calls.setConfig.push(c); },
    editAction: (m) => m(),
    setSelectedIds: () => {},
    setBiasHandlesVisible: () => {},
    copy: () => {},
    paste: () => {},
    addStops,
    takenOver,
    offerStops,
    // the offerStops block needs a Reduce Stops… item to ask through; the older blocks run without one
    reduceStops: offerStops ? () => {} : undefined,
  };
  return { items: buildGradientMenu(ctx), calls };
};
const item = (items: ContextMenuItem[], label: string) => items.find((i) => i.label === label && !i.isHeader);
{
  let added = 0;
  const { items, calls } = menuFor(zebraCfg, [], [], () => { added++; });
  const actionsAt = items.findIndex((i) => i.isHeader && i.label === 'Actions');
  check(items[actionsAt + 1]?.label === 'Add Stops', 'ramp: Add Stops heads the Actions section');
  item(items, 'Add Stops')!.action();
  check(added === 1, 'ramp: Add Stops runs the editor\'s addStops');
  item(items, 'Invert Gradient')!.action();
  const inv = calls.setConfig[0];
  const back = inv ? decodeRamp(inv.ramp) : null;
  check(calls.emit === 0 && !!back && back.every((c, i) => c.r === zebra[255 - i].r && c.g === zebra[255 - i].g) && inv.stops.length === 0 && inv.colorSpace === 'linear',
    'Invert on a ramp reverses the texels (setConfig, never emit)');
  item(items, 'Linear (Physical)')!.action();
  item(items, 'sRGB (Standard)')!.action();
  const out = calls.setConfig[2];
  check(calls.emit === 0 && out?.ramp === zebraCfg.ramp && out.colorSpace === 'srgb' && out.stops.length === 0, 'ramp: the output space keeps the ramp');
  const off = ['Double Stops', 'Distribute Selected', 'Delete Selected', 'Copy Gradient', 'Paste Gradient', 'Bias Handles', 'OkLab', 'RGB'];
  const blendLabels = items.slice(items.findIndex((i) => i.isHeader && i.label === 'Blend Mode') + 1, items.findIndex((i) => i.isHeader && i.label === 'Output Mode'));
  check(off.filter((l) => item(items, l)).every((l) => item(items, l)!.disabled) && blendLabels.length > 0 && blendLabels.every((i) => i.disabled),
    'ramp: stop-only items disabled (double, distribute, delete, clipboard, bias handles, every blend mode)');
  check(!item(items, 'Reset Default')!.disabled, 'ramp: Reset Default stays (it replaces the ramp with a stop gradient)');
  check(!item(menuFor(zebraCfg, [], []).items, 'Add Stops'), 'ramp without an addStops: no Add Stops item');
}
{
  // a host tool holds the strip (GE v2's Paint face, 2026-09-25): the actions that would rewrite
  // the stops under an unapplied painting are off and say why; Add Stops stays (the host applies first)
  const onRamp = menuFor(zebraCfg, [], [], () => {}, true).items;
  check(!!item(onRamp, 'Add Stops') && !item(onRamp, 'Add Stops')!.disabled, 'taken over, on a ramp: Add Stops stays');
  const onStops = menuFor(stopCfg, stops, ['a', 'b', 'c'], () => {}, true).items;
  const held = ['Invert Gradient', 'Double Stops', 'Distribute Selected', 'Delete Selected', 'Bias Handles'];
  check(held.every((l) => item(onStops, l)?.disabled && item(onStops, l)?.title === 'Apply or leave Paint first') && !!item(onRamp, 'Invert Gradient')?.disabled,
    'taken over: invert (a ramp\'s too), double, distribute, delete and bias handles are off, and say why');
}
{
  // with an offerStops (owner, 2026-09-25: "instead of disabling — a prompt to add stops if there are
  // none"): where the stops cannot be edited, Double / Reduce / Bias Handles ASK instead of greying out
  let asked = 0;
  const ask = () => { asked++; };
  const asking = ['Double Stops', 'Reduce Stops…', 'Bias Handles'];
  const rampItems = menuFor(zebraCfg, [], [], () => {}, false, ask).items;
  const heldItems = menuFor(stopCfg, stops, ['a', 'b', 'c'], () => {}, true, ask).items;
  const stopItems = menuFor(stopCfg, stops, ['a', 'b', 'c'], () => {}, false, ask).items;
  const offered = (items: ContextMenuItem[]) => asking.every((l) => {
    const it = item(items, l);
    if (!it || it.disabled) return false;
    const n = asked;
    it.action!();
    return asked === n + 1;
  });
  check(offered(rampItems), 'offerStops, on a ramp: double, reduce and bias handles ask to add stops');
  check(offered(heldItems) && !!item(heldItems, 'Invert Gradient')!.disabled && !!item(heldItems, 'Delete Selected')!.disabled, 'offerStops, taken over: they ask too; invert and delete stay off');
  const before = asked;
  item(stopItems, 'Double Stops')!.action!();
  check(asked === before, 'offerStops, on stops with nothing holding them: double runs, nothing asks');
}
{
  const { items, calls } = menuFor(stopCfg, stops, ['a', 'b', 'c'], () => {});
  check(!item(items, 'Add Stops'), 'stops: no Add Stops item even when one is passed');
  const enabled = ['Invert Gradient', 'Double Stops', 'Distribute Selected', 'Delete Selected', 'Copy Gradient', 'Paste Gradient', 'Bias Handles', 'Reset Default', 'sRGB (Standard)'];
  check(enabled.every((l) => item(items, l) && !item(items, l)!.disabled), 'stop menu unchanged: every action enabled with 3 of 4 selected');
  const blend = items.slice(items.findIndex((i) => i.isHeader && i.label === 'Blend Mode') + 1, items.findIndex((i) => i.isHeader && i.label === 'Output Mode'));
  check(blend.every((i) => !i.disabled), 'stop menu unchanged: blend modes enabled');
  item(items, 'Invert Gradient')!.action();
  item(items, 'Linear (Physical)')!.action();
  check(calls.emit === 2 && calls.setConfig.length === 0, 'stop menu unchanged: Invert and output space still emit stops');
}

console.log('\n[5] helpers');
{
  const twice = reverseRampGradient(reverseRampGradient(zebraCfg));
  check(twice.ramp === zebraCfg.ramp, 'reverse twice is the identity');
  const other = makeRampGradient(zebra.map((c) => ({ r: c.g, g: c.r, b: c.b })));
  check(!sameGradientBody(zebraCfg, other), 'two different ramps differ');
  check(sameGradientBody(zebraCfg, { ...zebraCfg, colorSpace: 'srgb' }), 'the same ramp is the same body (spaces aside)');
  check(!sameGradientBody(zebraCfg, stopCfg) && !sameGradientBody(stopCfg, zebraCfg), 'a ramp is never a stop gradient\'s body');
  check(sameGradientBody(stopCfg, { ...stopCfg, stops: stops.map((s) => ({ ...s })) }), 'equal stops are the same body');
  check(!sameGradientBody(stopCfg, { ...stopCfg, stops: stops.map((s, i) => (i === 2 ? { ...s, bias: 0.6 } : s)) }), 'a moved bias is a different body');
}

console.log('\n[6] wiring pin (text)');
{
  const ed = readFileSync(new URL('../components/AdvancedGradientEditor.tsx', import.meta.url), 'utf8');
  const has = (needle: string, n = 1) => ed.split(needle).length - 1 >= n;
  check(has('onPointerDown={affordances.addKnot ? handleTrackPointerDown : undefined}'), 'the knot track takes a press only through affordances.addKnot');
  check(has('{affordances.knots && knots.map('), 'the knot layer renders only through affordances.knots');
  check(has('if (!affordances.selectMarquee && !Number.isFinite(marqueeEscape)) return;'), 'the bar marquee is gated on a ramp');
  check(has('editorBarSource({') && has('paintStripPixels(STRIP_PREVIEW_W, barSource') && has('barTexels256(barSource'), 'both chromes paint from editorBarSource');
  check(has('onChangeRef.current(editorEmitConfig('), 'emitChange emits through editorEmitConfig');
  check(has('if (rampValueRef.current) return', 4), 'selectAt / dropColourAt / track press / paste refuse a ramp');
  check(has('{isRamp ? addStopsButton : ', 2), 'Add stops replaces the blend chooser in both chromes');
  const reg = readFileSync(new URL('../palette/registerPaletteUI.ts', import.meta.url), 'utf8');
  check(/setGradientStopFitter\(\(config\) => addStopsToConfig\(config,/.test(reg), 'registerPaletteUI fills the stop-fitter slot with addStopsToConfig');
}

console.log('\n[7] reader scan');
{
  const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const trees = ['palette/components', 'gradient-explorer', 'app-gmt', 'engine-gmt/components', 'fluid-toy', 'components'];
  const bad: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === 'node_modules') continue;
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(tsx?|mts)$/.test(name) || p.endsWith('rampMode.ts')) continue;
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (/\b(renderStopsToRamp|renderStopsToBuffer)\(\s*[\w?.]*\.stops\b/.test(line)) bad.push(`${relative(root, p)}:${i + 1}`);
      });
    }
  };
  for (const t of trees) walk(join(root, t));
  check(bad.length === 0, `no UI reader walks config.stops into a stop renderer${bad.length ? ` — ${bad.join(', ')}` : ''}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall green');
process.exit(failures ? 1 : 0);
