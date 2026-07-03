// Render Theli-At-MengerSpheres under a few DE overrides, SAVE each PNG, report
// nonBlack + sigma. Goal: find what surfaces the missing Menger detail.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const OUT = 'h:/tmp/theli-sweep';
fs.mkdirSync(OUT, { recursive: true });
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('theli'))!;
const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
let w = scene.header.width || 480, h = scene.header.height || 360;
const sc = 420 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);

const grid = [
  { tag: 'cur_est1_f0.2', estimator: 1, fudgeFactor: 0.2, deBailout: 1000, maxSteps: 1500 },
  { tag: 'est2_f0.2', estimator: 2, fudgeFactor: 0.2, deBailout: 1000, maxSteps: 1500 },
  { tag: 'est2_f0.5', estimator: 2, fudgeFactor: 0.5, deBailout: 1000, maxSteps: 1500 },
  { tag: 'est1_f0.5', estimator: 1, fudgeFactor: 0.5, deBailout: 1000, maxSteps: 1500 },
  { tag: 'est2_f0.2_steps2000', estimator: 2, fudgeFactor: 0.2, deBailout: 1000, maxSteps: 2000 },
  { tag: 'est1_f0.1_steps2000', estimator: 1, fudgeFactor: 0.1, deBailout: 1000, maxSteps: 2000 },
  { tag: 'est0_f0.3', estimator: 0, fudgeFactor: 0.3, deBailout: 1000, maxSteps: 1500 },
];

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

console.log(`Theli-At ${w}x${h}\n`);
for (const q of grid) {
  const { tag, ...qo } = q;
  const spec = { id: s.name, mode: 'single', size: [w, h], timeoutMs: 60000, imageFormat: 'png', qualityOverride: qo };
  let r: any = {};
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); }
  catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  if (url) fs.writeFileSync(`${OUT}/${tag}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${tag.padEnd(24)} nb=${nb.toFixed(3)} sigma=${sig.toFixed(0).padStart(4)}${r.error ? '  ERR ' + r.error.slice(0, 40) : ''}`);
}
await b.close();
console.log(`\nPNGs → ${OUT}`);
