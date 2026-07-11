// MB3D sample-scene thumbnails — render every bundled MB3D scene on the REAL GPU
// (ANGLE/D3D11 via headed Chrome, same path as cert-render.mts) and write a
// square, downsized JPEG to public/thumbnails/mb3d-scenes/<safeId>.jpg for the
// unified <FormulaPicker>'s "Mandelbulb3D" scene group.
//
// safeId MUST match mb3dSceneThumbSafeId() in engine-gmt/utils/mb3d/mb3dSceneThumbs.ts
// (name.replace(/[^a-z0-9]/gi,'_')) so the committed filename resolves from the
// scene name. No index.json — the SceneCard falls back to a cube icon on 404,
// so a scene that renders empty simply shows the icon (still click-to-load).
//
// Needs the harness server up: npx vite --port 5173 --strictPort
// Run: npx tsx debug/mb3d-scene-thumbs.mts [nameFilter]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { mb3dSceneThumbSafeId as safeId } from '../engine-gmt/utils/mb3d/mb3dSceneThumbs.ts';

const OUT = 'public/thumbnails/mb3d-scenes';
const RENDER_MAX = 360;   // native-aspect render size (supersampled before downscale)
const THUMB = 176;        // committed square JPEG edge
const QUALITY = 0.85;
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
const rows: Array<{ name: string; status: string; nb: number }> = [];
for (const s of scenes) {
  const scene = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  let w = scene.header.width || 500, h = scene.header.height || 375;
  const sc = RENDER_MAX / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
  let r: any = {};
  try {
    r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp),
      [scene, { id: s.name, mode: 'single', size: [w, h], timeoutMs: 60000, imageFormat: 'png' }] as any);
  } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  const status = r?.error ? 'ERROR' : nb < 0.02 ? 'EMPTY' : 'rendered';
  // Only commit thumbnails for scenes that actually rendered — an empty/black
  // render is worse than the SceneCard's cube-icon fallback (which still loads).
  if (url && status === 'rendered') {
    // Center-crop to square + downscale to THUMB (mirrors the card's object-cover),
    // JPEG-encode in a 2D canvas — no WebGL needed for the resize.
    const jpeg: string = await pg.evaluate(async ({ durl, THUMB, QUALITY }) => {
      const img = new Image(); img.src = durl;
      await new Promise<void>((res) => { img.onload = () => res(); });
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const c = document.createElement('canvas'); c.width = THUMB; c.height = THUMB;
      const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, side, side, 0, 0, THUMB, THUMB);
      return c.toDataURL('image/jpeg', QUALITY);
    }, { durl: url, THUMB, QUALITY });
    fs.writeFileSync(`${OUT}/${safeId(s.name)}.jpg`, Buffer.from(jpeg.split(',')[1], 'base64'));
  }
  rows.push({ name: s.name, status, nb });
  console.log(`${status.padEnd(14)} nb=${nb.toFixed(2)}  ${s.name}${r?.error ? '  [' + String(r.error).slice(0, 70) + ']' : ''}`);
}
await b.close();
const ok = rows.filter((r) => r.status.startsWith('rendered')).length;
const empty = rows.filter((r) => r.status.startsWith('EMPTY')).length;
const err = rows.filter((r) => r.status === 'ERROR').length;
console.log(`\n${ok}/${rows.length} rendered, ${empty} empty, ${err} errored → ${OUT}`);
