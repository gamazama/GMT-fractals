// Isolate each formula's contribution to Theli-At: render box-only, Menger-only,
// and full, by zeroing the other slot's iterCount. Saves PNGs to compare.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const OUT = 'h:/tmp/theli-iso';
fs.mkdirSync(OUT, { recursive: true });
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes('theli'))!;
const base = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
let w = base.header.width || 480, h = base.header.height || 360;
const sc = 420 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);

const clone = () => JSON.parse(JSON.stringify(base));
const variants: { tag: string; mut: (sc: any) => void }[] = [
  { tag: 'full', mut: () => {} },
  { tag: 'box-only', mut: (s) => { s.addon.slots[1].iterCount = 0; } },       // kill Menger
  { tag: 'menger-only', mut: (s) => { s.addon.slots[0].iterCount = 0; } },     // kill box
  { tag: 'menger-heavy', mut: (s) => { s.addon.slots[0].iterCount = 4; } },    // 4 box : 1 menger
  { tag: 'interleave-1-1', mut: (s) => { s.addon.slots[0].iterCount = 1; } },  // 1 box : 1 menger
];

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

console.log(`Theli-At isolate ${w}x${h}\n`);
for (const v of variants) {
  const scene = clone(); v.mut(scene);
  const spec = { id: s.name + ':' + v.tag, mode: 'single', size: [w, h], timeoutMs: 60000, imageFormat: 'png' };
  let r: any = {};
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); }
  catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const sig = Array.isArray(r?.render?.sigma) ? r.render.sigma.reduce((a: number, x: number) => a + x, 0) : 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  if (url) fs.writeFileSync(`${OUT}/${v.tag}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${v.tag.padEnd(16)} nb=${nb.toFixed(3)} sigma=${sig.toFixed(0).padStart(4)}${r.error ? '  ERR ' + r.error.slice(0, 40) : ''}`);
}
await b.close();
console.log(`\nPNGs → ${OUT}`);
