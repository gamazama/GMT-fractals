/**
 * geometry GPU/CPU parity smoke — the two implementations of the four 2D geometries agree.
 *
 * The geometries exist twice on purpose: `palette/core/rampGeometry.ts`'s `sampleGeometry` is
 * the authority and renders the STILL image (with serpentine error diffusion, which cannot be
 * a fragment shader — `debug/test-dither.mts` measures why that matters: WIGGLE 0.040 against
 * the blue-noise tail's 0.238), and `gradient-explorer/fullscreen/modes/geometryFrag.ts` is a
 * GLSL mirror used for LIVE frames, which the overlay was never dithering anyway.
 *
 * Two implementations of one law is a drift hazard the repo's usual answer — export the law,
 * call it from both — cannot fix across the JS/GLSL boundary. So this is the guard instead: for
 * every geometry, at several parameter sets, render the shader and the CPU field over the same
 * canvas and compare per pixel. It runs in a real browser because the shader needs a real GL.
 *
 * TOLERANCE. The two are not expected to be identical and should not be asserted to be: the
 * shader works in mediump-or-better floats and samples the LUT through a texture, the CPU path
 * in doubles with an explicit lerp. What is asserted is that no pixel is off by more than
 * MAX_DELTA (a handful of 8-bit levels, invisible in motion) and that the MEAN error stays
 * tiny — a geometry whose maths actually diverged moves both numbers by orders of magnitude,
 * not by a level or two. Measured on a clean tree 2026-09-08: worst max 3 levels, worst mean 0.750 (conic);
 * radial is the tightest. The ceilings below sit well above those and well below
 * what a real divergence produces — flipping BIAS_K in the shader alone (1.6 -> 2.6) gives max 115, mean 17.97 (falsified
 * 2026-09-08: three cases red, the biased ones).
 *
 * Run (needs `npm run dev`):  npx tsx debug/smoke-gx-geom-gpu.mts
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }

/** Per-pixel ceiling, in 8-bit levels, over the whole frame. */
const MAX_DELTA = 12;
/** Mean absolute error ceiling, in 8-bit levels. */
const MEAN_DELTA = 1.5;

const CASES: Array<[string, Record<string, number>]> = [
  ['linear', {}],
  ['linear', { linearAngle: 0.7, linearBias: 1.1 }],
  ['radial', {}],
  ['radial', { radialCx: 0.35, radialCy: -0.2, radialScale: 0.7, radialBias: -0.9 }],
  ['radial', { radialSineAmp: 0.45, radialSineFreq: 7 }],
  ['conic', {}],
  ['conic', { conicAngle: 1.1, conicCx: 0.25, conicMirror: 0.3, conicBiasA: 0.7, conicBiasB: -0.6 }],
  ['conic', { conicTwist: 1.4 }],
  ['linear', { linearBias: -1.4 }],
  ['radial', { radialSineAmp: -0.5, radialSineFreq: 4.5 }],
];

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const results = await page.evaluate(async (cases) => {
    const rg = await import('/palette/core/rampGeometry.ts');
    const gm = await import('/palette/core/gmtGradient.ts');
    const reg = await import('/gradient-explorer/fullscreen/modeRegistry.ts');
    await import('/gradient-explorer/fullscreen/modes/index.ts');
    const { FullscreenCompositor } = await import('/gradient-explorer/fullscreen/FullscreenCompositor.ts');

    const cfg = {
      colorSpace: 'srgb', blendSpace: 'oklab',
      stops: [
        { id: 'a', position: 0, color: '#0b1d51' },
        { id: 'b', position: 0.45, color: '#f2a65a' },
        { id: 'c', position: 1, color: '#7a1f4f' },
      ],
    };
    const ramp = (gm as any).renderStopsToRamp(cfg.stops, cfg.blendSpace, cfg.colorSpace);
    const lut = (gm as any).renderStopsToBuffer(cfg.stops, cfg.blendSpace, cfg.colorSpace);

    const W = 320, H = 220;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const comp = new (FullscreenCompositor as any)(canvas);
    if (!comp.isWebGL) return { error: 'no WebGL2 in this browser context' };
    comp.dither = false; // compare the geometry, not the tail
    comp.setSize(W, H);

    // NOTE: no inner function declarations in here. tsx compiles this body with esbuild's
    // keep-names, which wraps named functions in a `__name` helper that does not exist inside
    // the page — the evaluate then dies with "__name is not defined". Read inline instead.
    const c2 = document.createElement('canvas');
    c2.width = W; c2.height = H;
    const cx = c2.getContext('2d')!;

    const out: Array<{ geom: string; params: string; max: number; mean: number }> = [];
    for (const [geom, params] of cases as Array<[string, Record<string, number>]>) {
      const mode = (reg as any).getFullscreenMode(geom);
      const ctx = { ramp, lut, params, width: W, height: H };
      // GPU
      comp.uploadLut(lut);
      comp.presentMode(mode, ctx);
      cx.clearRect(0, 0, W, H); cx.drawImage(canvas, 0, 0);
      const gpu = cx.getImageData(0, 0, W, H).data;
      // CPU (the authority), same size, dither off
      comp.presentField(mode.field(ctx), W, H, (rg as any).DEFAULT_BACKGROUND, ramp);
      cx.clearRect(0, 0, W, H); cx.drawImage(canvas, 0, 0);
      const cpu = cx.getImageData(0, 0, W, H).data;

      let max = 0, sum = 0, n = 0;
      for (let i = 0; i < gpu.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          const d = Math.abs(gpu[i + k] - cpu[i + k]);
          if (d > max) max = d;
          sum += d; n++;
        }
      }
      out.push({ geom, params: JSON.stringify(params), max, mean: +(sum / n).toFixed(3) });
    }
    comp.dispose();
    return { out };
  }, CASES as never);

  if ((results as { error?: string }).error) fail((results as { error: string }).error);
  const rows = (results as { out: Array<{ geom: string; params: string; max: number; mean: number }> }).out;
  if (!rows?.length) fail('no comparisons ran');

  let bad = 0;
  for (const r of rows) {
    const ok = r.max <= MAX_DELTA && r.mean <= MEAN_DELTA;
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.geom.padEnd(7)} max Δ${String(r.max).padStart(3)}  mean Δ${r.mean.toFixed(3)}  ${r.params}`);
  }
  if (bad) {
    fail(`${bad} geometry/param case(s) diverged beyond tolerance — the GLSL mirror in `
      + `modes/geometryFrag.ts no longer matches sampleGeometry. Edit both in one commit.`);
  }
  console.log('\n✓ ALL PASS — the GLSL geometry mirror matches the CPU authority');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
