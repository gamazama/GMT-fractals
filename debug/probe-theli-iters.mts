import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
const OUT = 'h:/tmp/theli-iters'; fs.mkdirSync(OUT, { recursive: true });
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('theli'))!;
const base = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
let w = base.header.width || 480, h = base.header.height || 360;
const sc = 420 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage(); pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });
for (const it of [65, 80, 110, 160, 2000]) {  // one Chrome session, vary header.iterations
  const scene = JSON.parse(JSON.stringify(base)); scene.header.iterations = it;
  const spec = { id: s.name + ':it' + it, mode: 'single', size: [w, h], timeoutMs: 60000, imageFormat: 'png', qualityOverride: { fudgeFactor: 0.7, maxSteps: 2000 } };
  let r: any = {};
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0; const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl; if (url) fs.writeFileSync(`${OUT}/it${it}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`iters=${String(it).padEnd(5)} nb=${nb.toFixed(3)} sigma=${sig.toFixed(0).padStart(4)}`);
}
await b.close(); console.log('PNGs -> ' + OUT);
