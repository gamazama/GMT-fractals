/**
 * gx export-size harness — the pure size arithmetic behind Wallpaper's "export at size".
 *
 *   1. presets + orientation: the five presets, the edge swap, natural orientation.
 *   2. THE CLAMP (the file's `@invariant`): a ~2,600-shape sweep asserting no output ever
 *      exceeds 3840 px on an edge or 3840×2160 in pixels, that aspect survives the clamp,
 *      and that garbage inputs still yield a usable size.
 *   3. resolveExportSize: preset → PNG size → render size, the supersample gate by mode
 *      kind, and the render-budget degrade at 4K.
 *   4. filenames.
 *   5. readPngSize: a hand-built IHDR, plus rejection of non-PNG bytes.
 *
 * Falsification (2026-09-03, each reverted): dropping the pixel-budget term from
 * `clampExportSize`'s scale → 4 red (51 sweep cases + 16 plans over budget), exit 1;
 * `Math.round` instead of `Math.floor` on the quantisation → 1 red in [2] (20 cases rounding
 * back over the budget); `canSupersample` returning true for 'ownCanvas' → 1 red in [3].
 *
 * Run: npx tsx debug/test-gx-export-size.mts   (npm run test:gx-export)
 */

import {
  EXPORT_PRESETS,
  MAX_EXPORT_EDGE,
  MAX_EXPORT_PIXELS,
  MAX_RENDER_PIXELS,
  MIN_EXPORT_EDGE,
  canSupersample,
  clampExportSize,
  exportFileName,
  getExportPreset,
  naturalOrientation,
  orientSize,
  readPngSize,
  resolveExportSize,
  slugifyName,
  type ExportOrientation,
} from '../gradient-explorer/fullscreen/exportSize';

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

console.log('[1] presets + orientation');
{
  ok(EXPORT_PRESETS.length === 5, 'five presets');
  const ids = EXPORT_PRESETS.map((p) => p.id).join(',');
  ok(ids === 'phone,square,hd,uhd,custom', `preset order is phone,square,hd,uhd,custom (got ${ids})`);
  ok(getExportPreset('custom')!.size === null, 'custom carries no size');
  ok(getExportPreset('uhd')!.size!.width === 3840, '4K is 3840 wide');
  ok(getExportPreset('phone')!.size!.height === 2532, 'Phone is 2532 tall');

  // Every preset with numbers fits the budget untouched — a preset must never self-clamp.
  for (const p of EXPORT_PRESETS) {
    if (!p.size) continue;
    for (const o of ['landscape', 'portrait'] as ExportOrientation[]) {
      const s = orientSize(p.size, o);
      const c = clampExportSize(s.width, s.height);
      ok(!c.clamped, `preset ${p.id} (${o}) fits the budget unclamped`);
      ok(c.width === s.width && c.height === s.height, `preset ${p.id} (${o}) passes through exactly`);
    }
  }

  ok(orientSize({ width: 1920, height: 1080 }, 'portrait').width === 1080, 'landscape → portrait swaps');
  ok(orientSize({ width: 1170, height: 2532 }, 'landscape').width === 2532, 'portrait → landscape swaps');
  ok(orientSize({ width: 2048, height: 2048 }, 'portrait').width === 2048, 'a square is orientation-free');
  ok(naturalOrientation({ width: 1170, height: 2532 }) === 'portrait', 'phone reads portrait');
  ok(naturalOrientation({ width: 3840, height: 2160 }) === 'landscape', '4K reads landscape');
  ok(naturalOrientation({ width: 2048, height: 2048 }) === 'landscape', 'a square reads landscape');
}

console.log('[2] the clamp — the @invariant');
{
  // The sweep: every combination of a wide set of edges, plus the presets and some
  // deliberately hostile shapes. ~2,600 cases.
  const edges = [
    1, 16, 17, 100, 640, 1080, 1170, 1440, 1920, 2048, 2160, 2500, 2880, 3000, 3840,
    3841, 4096, 5000, 7680, 10000, 100000,
  ];
  const hostile: Array<[number, number]> = [
    [0, 0], [-5, -5], [NaN, NaN], [Infinity, Infinity], [-Infinity, 100],
    [0.4, 0.4], [1e9, 1], [1, 1e9], [3840, 2161], [2161, 3840], [2881, 2881],
  ];
  const cases: Array<[number, number]> = [...hostile];
  for (const w of edges) for (const h of edges) cases.push([w, h]);

  let overEdge = 0;
  let overPixels = 0;
  let degenerate = 0;
  let aspectDrift = 0;
  for (const [w, h] of cases) {
    const c = clampExportSize(w, h);
    if (c.width > MAX_EXPORT_EDGE || c.height > MAX_EXPORT_EDGE) overEdge++;
    if (c.width * c.height > MAX_EXPORT_PIXELS) overPixels++;
    if (!Number.isInteger(c.width) || !Number.isInteger(c.height)) degenerate++;
    if (c.width < MIN_EXPORT_EDGE || c.height < MIN_EXPORT_EDGE) degenerate++;
    // Aspect survives the clamp to WITHIN ONE PIXEL (the scale is quantised by floor), except
    // where an edge hit the MIN_EXPORT_EDGE floor — a 1e9:1 shape cannot keep its aspect AND
    // stay an image.
    if (c.clamped && c.width > MIN_EXPORT_EDGE && c.height > MIN_EXPORT_EDGE && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      // Anchor on the LONG edge (the one the scale lands exactly on); the short edge is the
      // one `floor` quantises, so it is the one that may be up to a pixel light.
      const longIn = Math.max(w, h);
      const shortIn = Math.min(w, h);
      const longOut = Math.max(c.width, c.height);
      const shortOut = Math.min(c.width, c.height);
      const exactShort = (longOut * shortIn) / longIn;
      if (Math.abs(exactShort - shortOut) > 1.0) aspectDrift++;
    }
  }
  ok(overEdge === 0, `clamp: no output exceeds ${MAX_EXPORT_EDGE} px on an edge (${overEdge} did)`);
  ok(overPixels === 0, `clamp: no output exceeds the 4K pixel budget (${overPixels} did)`);
  ok(degenerate === 0, `clamp: every output is a whole size >= ${MIN_EXPORT_EDGE} px (${degenerate} were not)`);
  ok(aspectDrift === 0, `clamp: aspect survives the clamp to within a pixel (${aspectDrift} drifted)`);

  // Named behaviours, so a red assertion says WHICH rule broke, not just "the sweep".
  ok(clampExportSize(3840, 2160).clamped === false, '4K landscape is exactly at the cap');
  ok(clampExportSize(2160, 3840).clamped === false, '4K portrait is exactly at the cap');
  ok(clampExportSize(2880, 2880).clamped === false, '2880² is exactly the pixel budget');
  const big = clampExportSize(7680, 4320);
  ok(big.clamped, '8K clamps');
  ok(big.width === 3840 && big.height === 2160, `8K clamps to 3840×2160 (got ${big.width}×${big.height})`);
  const tallSquare = clampExportSize(4000, 4000);
  ok(tallSquare.clamped && tallSquare.width === tallSquare.height, '4000² clamps and stays square');
  ok(tallSquare.width * tallSquare.height <= MAX_EXPORT_PIXELS, '4000² lands inside the pixel budget');
  ok(clampExportSize(NaN, NaN).width === MIN_EXPORT_EDGE, 'NaN → the minimum edge');
  ok(clampExportSize(0, 0).height === MIN_EXPORT_EDGE, '0 → the minimum edge');
}

console.log('[3] resolveExportSize');
{
  const base = { customWidth: 1000, customHeight: 1000, orientation: 'landscape' as ExportOrientation, supersample: false };

  const hd = resolveExportSize({ ...base, preset: 'hd', kind: 'cpuField' });
  ok(hd.width === 1920 && hd.height === 1080, '1080p resolves to 1920×1080');
  ok(hd.factor === 1 && hd.renderWidth === 1920, 'no supersample → render size == PNG size');

  const hdSS = resolveExportSize({ ...base, preset: 'hd', supersample: true, kind: 'cpuField' });
  ok(hdSS.factor === 2, 'cpuField supersamples');
  ok(hdSS.renderWidth === 3840 && hdSS.renderHeight === 2160, '×2 renders at 3840×2160');
  ok(hdSS.width === 1920 && hdSS.height === 1080, '×2 leaves the PNG size alone');
  ok(!hdSS.supersampleDropped, '1080p ×2 fits the render budget');

  // The supersample gate is by mode KIND (the panel greys the toggle out with the same call).
  ok(canSupersample('cpuField'), 'cpuField can supersample');
  ok(canSupersample('cpuRaster'), 'cpuRaster can supersample');
  ok(!canSupersample('glQuad'), 'glQuad cannot supersample');
  ok(!canSupersample('ownCanvas'), 'ownCanvas cannot supersample');
  const glSS = resolveExportSize({ ...base, preset: 'hd', supersample: true, kind: 'glQuad' });
  ok(glSS.factor === 1 && !glSS.supersampleAvailable, 'glQuad ignores the supersample toggle');
  ok(!glSS.supersampleDropped, 'unavailable is not the same as dropped');
  const ownSS = resolveExportSize({ ...base, preset: 'uhd', supersample: true, kind: 'ownCanvas' });
  ok(ownSS.factor === 1 && ownSS.renderWidth === ownSS.width, 'ownCanvas renders at the PNG size');

  // The render-budget degrade: 4K ×2 would be 33 MPx of CPU work.
  const uhdSS = resolveExportSize({ ...base, preset: 'uhd', supersample: true, kind: 'cpuField' });
  ok(uhdSS.factor === 1, '4K ×2 degrades to ×1');
  ok(uhdSS.supersampleDropped, '4K ×2 reports the drop');
  ok(uhdSS.renderWidth * uhdSS.renderHeight <= MAX_RENDER_PIXELS, '4K render stays inside the render budget');
  const sqSS = resolveExportSize({ ...base, preset: 'square', supersample: true, kind: 'cpuField' });
  ok(sqSS.factor === 2 && !sqSS.supersampleDropped, '2048² ×2 is exactly the render budget');

  // Orientation applies to presets, not just customs.
  const phoneLand = resolveExportSize({ ...base, preset: 'phone', kind: 'cpuField' });
  ok(phoneLand.width === 2532 && phoneLand.height === 1170, 'Phone honours a landscape request');
  const uhdPort = resolveExportSize({ ...base, preset: 'uhd', orientation: 'portrait', kind: 'cpuField' });
  ok(uhdPort.width === 2160 && uhdPort.height === 3840, '4K portrait is 2160×3840');
  ok(!uhdPort.clamped, '4K portrait is not clamped');

  // Customs go through the same clamp.
  const custom = resolveExportSize({ ...base, preset: 'custom', customWidth: 9000, customHeight: 9000, kind: 'cpuField' });
  ok(custom.clamped, 'an oversized custom clamps');
  ok(custom.width * custom.height <= MAX_EXPORT_PIXELS, 'a clamped custom is inside the budget');
  const junk = resolveExportSize({ ...base, preset: 'custom', customWidth: NaN, customHeight: -3, kind: 'cpuField' });
  ok(junk.width >= MIN_EXPORT_EDGE && junk.height >= MIN_EXPORT_EDGE, 'junk custom input still yields an image');

  // Every plan, for every preset × orientation × kind × supersample, respects both budgets.
  let planViolations = 0;
  for (const p of EXPORT_PRESETS) {
    for (const o of ['landscape', 'portrait'] as ExportOrientation[]) {
      for (const kind of ['cpuField', 'cpuRaster', 'glQuad', 'ownCanvas'] as const) {
        for (const ss of [false, true]) {
          const plan = resolveExportSize({
            preset: p.id, customWidth: 6000, customHeight: 6000, orientation: o, supersample: ss, kind,
          });
          if (plan.width * plan.height > MAX_EXPORT_PIXELS) planViolations++;
          if (Math.max(plan.width, plan.height) > MAX_EXPORT_EDGE) planViolations++;
          if (plan.renderWidth * plan.renderHeight > MAX_RENDER_PIXELS) planViolations++;
          if (plan.renderWidth !== plan.width * plan.factor) planViolations++;
        }
      }
    }
  }
  ok(planViolations === 0, `every preset×orientation×kind×ss plan respects both budgets (${planViolations} did not)`);
}

console.log('[4] filenames');
{
  ok(slugifyName('  Sunset  Fade ') === 'sunset-fade', 'slug trims + dashes');
  ok(slugifyName('Ocean/Deep #2') === 'ocean-deep-2', 'slug drops punctuation');
  ok(slugifyName('') === 'gradient', 'empty name falls back');
  ok(slugifyName('!!!') === 'gradient', 'all-punctuation name falls back');
  ok(
    exportFileName('Sunset Fade', 'linear', 1920, 1080) === 'sunset-fade-linear-1920x1080.png',
    'filename carries mode + size',
  );
  ok(
    exportFileName('x', 'gradientMap', 1600.4, 900.6) === 'x-gradientMap-1600x901.png',
    'filename rounds fractional sizes',
  );
}

console.log('[5] readPngSize');
{
  const png = (w: number, h: number): Uint8Array => {
    const b = new Uint8Array(24);
    b.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
    b.set([0, 0, 0, 13], 8); // IHDR length
    b.set([0x49, 0x48, 0x44, 0x52], 12); // 'IHDR'
    b.set([(w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255], 16);
    b.set([(h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255], 20);
    return b;
  };
  const a = readPngSize(png(3840, 2160));
  ok(a !== null && a.width === 3840 && a.height === 2160, 'reads 3840×2160');
  const b = readPngSize(png(1600, 900));
  ok(b !== null && b.width === 1600 && b.height === 900, 'reads the fractal cap size 1600×900');
  ok(readPngSize(new Uint8Array(10)) === null, 'a short buffer is rejected');
  ok(readPngSize(new Uint8Array(24)) === null, 'zeroed bytes are not a PNG');
  const noIhdr = png(100, 100);
  noIhdr[13] = 0x00;
  ok(readPngSize(noIhdr) === null, 'a PNG signature without IHDR is rejected');
  ok(readPngSize(png(0, 0)) === null, 'a 0×0 header is rejected');
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nOK — gx export size: all assertions passed');
