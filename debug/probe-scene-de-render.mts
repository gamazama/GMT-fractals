import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
const OUT = 'h:/tmp/scene-de'; fs.mkdirSync(OUT, { recursive: true });
const names = ['theli', 'genetic', 'batjorge', 'hyperben', 'tree planet', 'menger trees'];
const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage(); pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });
for (const nm of names) {
  const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(nm)); if (!s) continue;
  const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  let w = scene.header.width || 480, h = scene.header.height || 360; const sc = 420 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
  const file = s.name.replace(/[^a-z0-9]/gi, '_');
  const spec = { id: s.name, mode: 'single', size: [w, h], timeoutMs: 90000, imageFormat: 'png' };  // NO override → uses scene-derived preset
  let r: any = {}; const t0 = Date.now();
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0; const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl; if (url) fs.writeFileSync(`${OUT}/${file}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${s.name.padEnd(26)} nb=${nb.toFixed(3)} sigma=${sig.toFixed(0).padStart(4)} ${((Date.now()-t0)/1000).toFixed(1)}s${r.error ? ' ERR ' + r.error.slice(0, 30) : ''}`);
}
await b.close(); console.log('PNGs -> ' + OUT);
