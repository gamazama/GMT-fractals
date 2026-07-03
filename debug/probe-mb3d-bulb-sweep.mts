/**
 * DE sweep for a sparse/solid MB3D bulb scene (Track C). Renders one bundled
 * scene under a grid of quality overrides (estimator × deBailout × fudge) on the
 * real GPU and reports nonBlackFraction + sigma, so we can find a DE that resolves
 * the surface (structured: moderate nb + high sigma) instead of solid-white
 * (high nb, low sigma) or sparse (low nb). Run: npx tsx debug/probe-mb3d-bulb-sweep.mts [sceneFilter]
 */
import { chromium } from 'playwright';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const filter = (process.argv[2] ?? 'spinejulia').toLowerCase();
const scene = MB3D_SAMPLE_SCENES.find((s) => s.name.toLowerCase().includes(filter));
if (!scene) { console.error('no scene matches', filter); process.exit(1); }
const parsed = parseMB3DBinary(decodeSampleScene(scene.b64), scene.name);
let w = parsed.header.width || 480, h = parsed.header.height || 360;
const sc = 360 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);

const grid: Record<string, number>[] = [];
for (const estimator of [0, 2, 3]) {
  for (const deBailout of [4, 16, 100]) {
    for (const fudgeFactor of [0.5, 0.9]) {
      grid.push({ estimator, deBailout, fudgeFactor });
    }
  }
}

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

console.log(`sweeping ${scene.name} (${w}x${h}), ${grid.length} combos\n`);
console.log('est  bail  fudge   nb     sigma   verdict');
for (const q of grid) {
  const spec = { id: scene.name, mode: 'single', size: [w, h], timeoutMs: 60000, qualityOverride: q };
  let r: any = {};
  try { r = await pg.evaluate(([s, sp]) => (window as any).runMB3DWeaveTest(s, sp), [parsed, spec] as any); }
  catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const verdict = r?.error ? 'ERR ' + String(r.error).slice(0, 40)
    : nb > 0.95 && sig < 12 ? 'SOLID'
    : nb < 0.02 ? 'EMPTY'
    : nb < 0.08 ? 'sparse'
    : sig >= 12 ? 'STRUCTURED ***' : 'flat';
  console.log(`${String(q.estimator).padEnd(4)} ${String(q.deBailout).padEnd(5)} ${String(q.fudgeFactor).padEnd(6)} ${nb.toFixed(3)}  ${sig.toFixed(0).padStart(5)}   ${verdict}`);
}
await b.close();
