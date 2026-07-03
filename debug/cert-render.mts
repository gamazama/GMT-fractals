// MB3D certification render — every bundled scene → GMT render at its native
// aspect, faithful camera, full-frame, into cert/gmt/<scene>.png for 1:1
// side-by-side against an MB3D reference in cert/../output/<scene>.jpg.
//
// Uses HEADED Chrome → the real GPU (ANGLE/D3D11), NOT headless SwiftShader
// (which is CPU-bound and takes hours for a full pass). Needs the dev/harness
// server up at localhost:5173. Run: npx tsx debug/cert-render.mts [nameFilter]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const OUT = 'H:/GMT/refSoftware/MB3D/cert/gmt';
const REF = 'H:/GMT/refSoftware/MB3D/output';
const MAXDIM = 480;
const filter = process.argv[2]?.toLowerCase();

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  headless: false,                       // headed → real GPU
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

const scenes = MB3D_SAMPLE_SCENES.filter((s) => !filter || s.name.toLowerCase().includes(filter));
const rows: any[] = [];
for (const s of scenes) {
  const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  let w = scene.header.width || 500, h = scene.header.height || 375;
  const sc = MAXDIM / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
  const file = s.name.replace(/[^a-z0-9]/gi, '_');
  let r: any = {};
  try {
    r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp),
      [scene, { id: s.name, mode: 'single', size: [w, h], timeoutMs: 60000, imageFormat: 'png' }] as any);
  } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  if (url) fs.writeFileSync(`${OUT}/${file}.png`, Buffer.from(url.split(',')[1], 'base64'));
  const hasRef = fs.existsSync(`${REF}/${s.name}.jpg`) || fs.existsSync(`${REF}/${file}.jpg`);
  const status = r?.error ? 'ERROR' : nb < 0.02 ? 'EMPTY' : 'rendered';
  rows.push({ name: s.name, status, ref: hasRef ? 'ref' : '-', err: r?.error ? String(r.error).slice(0, 70) : '' });
  console.log(`${status.padEnd(9)} nb=${nb.toFixed(2)} ${(hasRef ? 'ref' : '-').padEnd(3)} ${s.name}${rows[rows.length - 1].err ? '  [' + rows[rows.length - 1].err + ']' : ''}`);
}
await b.close();
console.log(`\n${rows.filter((r) => r.status === 'rendered').length}/${rows.length} rendered, ${rows.filter((r) => r.ref === 'ref').length} have MB3D reference → ${OUT}`);
