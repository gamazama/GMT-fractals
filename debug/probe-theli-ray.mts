import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
const OUT = 'h:/tmp/theli-ray'; fs.mkdirSync(OUT, { recursive: true });
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('theli'))!;
const base = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
let w = base.header.width || 480, h = base.header.height || 360;
const sc = 420 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage(); pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });
const combos = [
  { tag: 'A_fudge0.2_steps1500', fudgeFactor: 0.2, maxSteps: 1500 },
  { tag: 'B_fudge0.2_steps8000', fudgeFactor: 0.2, maxSteps: 8000 },  // more steps only
  { tag: 'C_fudge0.7_steps1500', fudgeFactor: 0.7, maxSteps: 1500 },  // bigger steps only
  { tag: 'D_fudge0.7_steps8000', fudgeFactor: 0.7, maxSteps: 8000 },  // both
];
const scene = JSON.parse(JSON.stringify(base)); scene.header.iterations = 50; // iterations only affect speed
for (const c of combos) {
  const { tag, ...qo } = c;
  const spec = { id: s.name + ':' + tag, mode: 'single', size: [w, h], timeoutMs: 90000, imageFormat: 'png', qualityOverride: qo };
  let r: any = {}; const t0 = Date.now();
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0; const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl; if (url) fs.writeFileSync(`${OUT}/${tag}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${tag.padEnd(22)} nb=${nb.toFixed(3)} sigma=${sig.toFixed(0).padStart(4)} ${((Date.now()-t0)/1000).toFixed(1)}s`);
}
await b.close(); console.log('PNGs -> ' + OUT);
