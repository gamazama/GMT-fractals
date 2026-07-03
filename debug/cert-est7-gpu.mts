// GPU cert for the numeric-DE (est7) log-domain fix — HEADED Chrome / real ANGLE D3D11
// (rule 2 of S-numeric-de-reliability: never headless SwiftShader). Renders:
//   1. native Mandelbulb: estimator 0 (analytic control) vs 7 (numeric) — was black on 7.
//   2. Oxnot - Shells (MB3D fused hybrid) via runMB3DWeaveTest — the no-ADE escape target.
// Reports nonBlackFraction (objective black-scene metric) + writes PNGs to h:/tmp.
// Requires the vite dev server (render-harness.html) already running.
//   npx tsx debug/cert-est7-gpu.mts [--port=5173]
import * as fs from 'fs';
import { chromium } from 'playwright';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';

const arg = (f: string, d?: string) => process.argv.find((a) => a.startsWith(f + '='))?.slice(f.length + 1) ?? d;
const PORT = arg('--port', '5173')!;
const URL = `http://localhost:${PORT}/render-harness.html`;
const SIZE = 420;

function b64ToBytes(b64: string): Uint8Array {
  const bin = Buffer.from(b64, 'base64');
  return new Uint8Array(bin);
}
function savePng(dataUrl: string, out: string) {
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
}

// est7 numeric recipe (S-numeric-de-reliability): estimator 7 + numDEeps + looser detail +
// explicit iterations (coreMath — qualityOverride won't set it).
const NUM = { quality: { estimator: 7, numDEeps: 0.3, detail: 1.5, maxSteps: 300 }, coreMath: { iterations: 60 } };
const ANL = { quality: { estimator: 0 }, coreMath: { iterations: 60 } };

async function main() {
  const oxnotScene = parseMB3DBinary(b64ToBytes(MB3D_SAMPLE_SCENES.find((s) => s.name === 'Oxnot - Shells')!.b64), 'Oxnot - Shells');

  const browser = await chromium.launch({
    headless: false, // HEADED → real ANGLE D3D11, not headless SwiftShader (rule 2)
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu-rasterization'],
  });
  const ctx = await browser.newContext({ viewport: { width: SIZE + 60, height: SIZE + 120 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  const gpu = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') as WebGL2RenderingContext;
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log('GPU renderer:', gpu);
  if (/swiftshader|software|llvmpipe/i.test(String(gpu))) console.log('  ⚠ WARNING: software renderer — NOT real ANGLE!');

  async function nativeShot(label: string, formula: string, over: any, out: string) {
    const res: any = await page.evaluate(async (spec) => await (window as any).runRenderTest(spec), {
      id: label, formula, mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000, configOverrides: over,
    });
    if (res?.thumbnailPNG) savePng(res.thumbnailPNG, out);
    const nb = res?.render?.nonBlackFraction ?? 0;
    console.log(`  ${label.padEnd(22)} ok=${res?.ok} nonBlack=${(nb * 100).toFixed(1)}%  compile=${res?.compile?.totalMs ?? '?'}ms  ${res?.error ?? ''} → ${out}`);
    return nb;
  }
  async function weaveShot(label: string, scene: any, over: any, out: string) {
    const res: any = await page.evaluate(async ({ scene, spec }) => await (window as any).runMB3DWeaveTest(scene, spec), {
      scene, spec: { id: label, formula: '', mode: 'single', size: [SIZE, SIZE], timeoutMs: 90000, configOverrides: over },
    });
    if (res?.thumbnailPNG) savePng(res.thumbnailPNG, out);
    const nb = res?.render?.nonBlackFraction ?? 0;
    console.log(`  ${label.padEnd(22)} ok=${res?.ok} nonBlack=${(nb * 100).toFixed(1)}%  compile=${res?.compile?.totalMs ?? '?'}ms  ${res?.error ?? ''} → ${out}`);
    return nb;
  }

  console.log('\n=== Mandelbulb (native canary — was black on est7) ===');
  await nativeShot('mbulb-analytic(est0)', 'Mandelbulb', ANL, 'h:/tmp/cert-mbulb-est0.png');
  await nativeShot('mbulb-numeric(est7)', 'Mandelbulb', NUM, 'h:/tmp/cert-mbulb-est7.png');

  console.log('\n=== Oxnot - Shells (no-ADE escape target, est7) ===');
  await weaveShot('oxnot-numeric(est7)', oxnotScene, NUM, 'h:/tmp/cert-oxnot-est7.png');

  if (errors.length) { console.log('\n⚠ page errors:'); errors.slice(0, 8).forEach((e) => console.log('  ' + e)); }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
