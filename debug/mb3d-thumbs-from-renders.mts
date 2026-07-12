// Build MB3D scene thumbnails from the user's high-quality in-app renders
// (better lighting than the single-mode harness). Maps each PNG in the source
// dir back to its bundled scene by the user's filename transform
// (name.toLowerCase().replace(/ /g,'-'), plus a browser "(N)" dedup suffix),
// center-crops to square + downsizes to a 176px JPEG, and overwrites the
// committed thumbnail. Headless 2D-canvas resize — no GPU needed.
// Run: npx tsx debug/mb3d-thumbs-from-renders.mts [srcDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { mb3dSceneThumbSafeId } from '../engine-gmt/utils/mb3d/mb3dSceneThumbs.ts';

const SRC = process.argv[2] || 'H:/tmp/mb3dFix';
const OUT = 'public/thumbnails/mb3d-scenes';
const THUMB = 176;
const QUALITY = 0.85;

// user filename key → scene safeId
const keyToSafeId = new Map<string, string>();
for (const s of MB3D_SAMPLE_SCENES) {
  keyToSafeId.set(s.name.toLowerCase().replace(/ /g, '-'), mb3dSceneThumbSafeId(s.name));
}

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => /\.png$/i.test(f));
const b = await chromium.launch({ headless: true });
const pg = await b.newPage();

let matched = 0;
for (const f of files) {
  const key = f.replace(/\s*\(\d+\)\.png$/i, '').replace(/\.png$/i, '').toLowerCase();
  const safeId = keyToSafeId.get(key);
  if (!safeId) { console.log(`UNMATCHED  ${f}  (key="${key}")`); continue; }
  const durl = 'data:image/png;base64,' + fs.readFileSync(path.join(SRC, f)).toString('base64');
  const jpeg: string = await pg.evaluate(async ({ durl, THUMB, QUALITY }) => {
    const img = new Image(); img.src = durl;
    await new Promise<void>((res) => { img.onload = () => res(); });
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
    const c = document.createElement('canvas'); c.width = THUMB; c.height = THUMB;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, THUMB, THUMB);
    return c.toDataURL('image/jpeg', QUALITY);
  }, { durl, THUMB, QUALITY });
  fs.writeFileSync(`${OUT}/${safeId}.jpg`, Buffer.from(jpeg.split(',')[1], 'base64'));
  console.log(`OK  ${f}  →  ${safeId}.jpg`);
  matched++;
}
await b.close();
console.log(`\n${matched}/${files.length} thumbnails written from ${SRC}`);
