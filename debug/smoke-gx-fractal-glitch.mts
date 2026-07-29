/**
 * Smoke — the deep-zoom LA path is GLITCH-FREE (ADR-0065).
 *
 * Two historical artifacts, both as a coherent wrong-coloured block inside the
 * L∞ region where LA applies:
 *   1. escaping-reference square — view centre escapes early (orbitLen 588) →
 *      auto-reference relocates to a deeper non-escaping point (worker fix).
 *   2. stripe/trap "diagonal square" — LA/AT skip the per-iteration colour
 *      accumulator → gated off for per-iter colour modes (kernel fix).
 *
 * Programmatic SQUARE-DETECTOR: render each view with LA ON and LA OFF (pure
 * perturbation = the correct baseline) and compare the largest single-colour
 * fraction in the central 40% box. A wrong-coloured block spikes that fraction;
 * a correct render matches the LA-off baseline. We assert
 * |dominant_on − dominant_off| stays small (the block would blow it up), and for
 * the escaping view that the auto-reference actually relocated.
 *
 * ⚠ **The Δ comparison is RELATIVE and cancels any defect shared by both
 * renders.** Measured 2026-07-29 in the guard sweep, twice:
 *   - Reproducing bug 1 exactly (auto-reference gate inverted in
 *     `computeReferenceOrbit` — grep `disableAutoReference`; orbitLen fell to the
 *     588 named above) drove escaping-square's dominant from 0.019 to 0.500 /
 *     0.599 — an enormous block — but Δ was only **0.099**, comfortably under
 *     MAX_DOMINANT_DELTA. Only the `relocated` assertion caught it.
 *   - Forcing the display shader to a constant colour (a blank render) gave
 *     dominant 1.000 / 1.000 and Δ 0.000 on all three views: **exit 0, full
 *     success banner, nothing rendered at all.**
 * So each view also carries an ABSOLUTE ceiling, `maxDominant`, asserted on both
 * the LA-on and the LA-off capture. Its job is to prove the detector's subject
 * exists — that the central box has structure — before the negative Δ assertion
 * is allowed to mean anything.
 *
 * Drives window.__fractalRenderer directly. Headless GPU is slow (~1 frame/3s)
 * so we wait generously; the block is coherent and visible well before TSAA
 * converges, and the detector is a distribution comparison (not pixel-exact),
 * so it's robust to the accumulator state at capture time.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';
// Headless CI uses a software GPU (~1 frame/3s); the coherent wrong-coloured
// block is visible well before TSAA converges, and the detector is a colour-
// distribution comparison (not pixel-exact), so a short accumulation suffices.
const WAIT_MS = Number(process.env.WAIT_MS || 6000);
/** Max allowed central-dominant difference (LA-on minus LA-off). A correct render
 *  sits near 0 — measured 0.000 on all three views, 2026-07-29.
 *
 *  This comment used to claim "the broken blocks pushed this well past 0.3". That
 *  is NOT what bug 1 does: reproducing it drove Δ to only 0.099, under this bound.
 *  Do not read a green Δ as proof the blocks are gone — `expectRelocate`,
 *  `expectPeriodic` and `maxDominant` are what actually catch them. */
const MAX_DOMINANT_DELTA = 0.18;

interface View {
  name: string;
  center: [number, number]; centerLow: [number, number];
  zoom: number; iterMul: number; colorMapping: number; gradientRepeat: number;
  expectRelocate: boolean;
  /** Absolute ceiling on the central-box dominant fraction, for BOTH captures.
   *  Set at ~2-3x the measured healthy value (recorded per view below) — it is a
   *  "the render has structure" floor, not a tuned tolerance. A blank render
   *  reads 1.000 here and is the case this exists to catch. */
  maxDominant: number;
  /** ADR-0066: this view dives into a minibrot, so the builder should adopt a
   *  PERIODIC (nucleus) reference — a short orbit wrapped modulo its period. */
  expectPeriodic?: boolean;
}
const VIEWS: View[] = [
  // measured healthy 2026-07-29: 0.019 / 0.019. Broken (bug 1 reproduced): 0.500 / 0.599.
  { name: 'escaping-square', center: [-0.8647752352263411, 0.2422927873189491], centerLow: [0, 0],
    zoom: 6.869923567136315e-8, iterMul: 3.25, colorMapping: 0, gradientRepeat: 1, expectRelocate: true,
    maxDominant: 0.25 },
  // measured healthy 2026-07-29: 0.101 / 0.101.
  { name: 'stripe-square', center: [-0.9156735264832646, 0.2767818751974872], centerLow: [9.86006185867458e-20, 7.693468076460417e-20],
    zoom: 5.755175641243117e-25, iterMul: 1, colorMapping: 9, gradientRepeat: 32, expectRelocate: false,
    maxDominant: 0.35 },
  // ADR-0065 Fix-5 view (interior centre, exterior-dominated). Under ADR-0066
  // this is recognised as a proper minibrot dive: the builder adopts the exact
  // period-P nucleus (short periodic orbit, LA stays ON) and it renders matching
  // the pure-PO baseline — no black L∞ square. (Previously LA was skipped via
  // laUnsafe; the nucleus reference makes LA correct here.)
  // measured healthy 2026-07-29: 0.338 / 0.338 — highest of the three, this view
  // is interior-dominated by construction, so the ceiling is correspondingly loose.
  { name: 'interior-ref', center: [-0.6396519243564869, 0.447970190714411], centerLow: [-3.662917280078923e-17, -9.391336225550338e-18],
    zoom: 5.244358778813348e-8, iterMul: 1, colorMapping: 0, gradientRepeat: 0.03, expectRelocate: true, expectPeriodic: true,
    maxDominant: 0.60 },
];

function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 880, height: 720 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const s = await import('/palette/store/fullscreenStore.ts');
    const cfg = { colorSpace: 'srgb', blendSpace: 'oklab', stops: [
      { id: 'a', position: 0, color: '#03071e' }, { id: 'b', position: 0.4, color: '#48cae4' },
      { id: 'c', position: 0.7, color: '#ffd60a' }, { id: 'd', position: 1, color: '#e63946' },
    ] };
    (s as any).openFullscreen(cfg, 'Glitch smoke');
    (s as any).setFullscreenGeom('fractal');
  });
  await page.waitForTimeout(1500);

  const render = async (v: View, useLA: boolean) => {
    const stats = await page.evaluate(async ({ v, useLA }) => {
      const r = (window as any).__fractalRenderer;
      if (!r) throw new Error('no __fractalRenderer handle');
      r.setDeepZoomEnabled(true);
      r.setParams({ center: v.center, centerLow: v.centerLow, zoom: v.zoom, iterMul: v.iterMul,
        colorMapping: v.colorMapping, gradientRepeat: v.gradientRepeat, useLA });
      await r.rebuildDeepZoom();
      return r.lastDeepStats;
    }, { v, useLA });
    await page.waitForTimeout(WAIT_MS);
    const dominant = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="fullscreen-gradient-overlay"]');
      const canvas = ov?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return -1;
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const c2 = tmp.getContext('2d')!;
      c2.drawImage(canvas, 0, 0);
      const W = tmp.width, H = tmp.height;
      const { data } = c2.getImageData(0, 0, W, H);
      const x0 = Math.floor(W * 0.3), x1 = Math.floor(W * 0.7);
      const y0 = Math.floor(H * 0.3), y1 = Math.floor(H * 0.7);
      const hist = new Map<string, number>();
      let n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        const k = (data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3);
        hist.set(k, (hist.get(k) ?? 0) + 1); n++;
      }
      let maxFrac = 0;
      for (const c of hist.values()) maxFrac = Math.max(maxFrac, c / n);
      return maxFrac;
    });
    return { stats, dominant };
  };

  for (const v of VIEWS) {
    const on = await render(v, true);
    const off = await render(v, false);
    if (on.dominant < 0 || off.dominant < 0) fail(`${v.name}: canvas missing`);
    const delta = Math.abs(on.dominant - off.dominant);
    console.log(`${v.name}: LA-on dominant=${on.dominant.toFixed(3)} LA-off dominant=${off.dominant.toFixed(3)} Δ=${delta.toFixed(3)} | relocated=${on.stats?.relocated} period=${on.stats?.period} orbitLen=${on.stats?.orbitLen} eps=${on.stats?.laEpsilonLog2}`);
    // Prove the subject exists BEFORE any of the negative assertions below are
    // allowed to mean anything. A blank/flat central box reads 1.000 on both
    // captures and Δ 0.000; bug 1 reads 0.500 / 0.599 against a 0.019 baseline.
    if (on.dominant > v.maxDominant || off.dominant > v.maxDominant) {
      fail(`${v.name}: central box is dominated by ONE colour (LA-on ${on.dominant.toFixed(3)}, LA-off ${off.dominant.toFixed(3)} > ${v.maxDominant}) — blank render, or a block present in BOTH captures which the Δ comparison cancels out`);
    }
    if (v.expectRelocate && !on.stats?.relocated) {
      fail(`${v.name}: auto-reference did not relocate (orbit escaped early but no deeper reference chosen)`);
    }
    if (v.expectPeriodic && !(on.stats?.period > 0)) {
      fail(`${v.name}: expected a periodic (nucleus) reference (ADR-0066) but period=${on.stats?.period}`);
    }
    if (delta > MAX_DOMINANT_DELTA) {
      fail(`${v.name}: LA-on central colour distribution diverges from LA-off baseline (Δ=${delta.toFixed(3)} > ${MAX_DOMINANT_DELTA}) — wrong-coloured block likely present`);
    }
  }

  if (errors.length) fail(`runtime errors:\n  ${errors.join('\n  ')}`);
  console.log('\n✓ deep-zoom LA path is glitch-free: escaping-reference square relocated, stripe square gated, interior-ref dives to a periodic nucleus reference; all match the pure-PO baseline');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
