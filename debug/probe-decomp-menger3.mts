/**
 * Render the x87-decompiled Menger3 (proof-of-concept). Reads the GLSL produced
 * by h:/tmp/mb3d-decomp/decompile.mjs, bakes the const-buffer values (decoded
 * from MB3D's FillCustomVBufWithVars for the default Menger3 options), wraps it
 * as a per-iteration formula, and renders via the harness. Requires vite:5173.
 */
import * as fs from 'fs';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';

// Const buffer for Menger3 default options (Scale=3, CScale=1,1,1, Rot1=Rot2=0).
// Layout per FillCustomVBufWithVars: Cm8=0.5 (fixed), Cm16=Scale, Cm24/32/40=CScale,
// Cm44..76 = BuildRotMatrix(Rot1) row-major, Cm80..112 = BuildRotMatrix(Rot2).
const C: Record<string, number> = {
  Cm8: 0.5, Cm16: 3, Cm24: 1, Cm32: 1, Cm40: 1,
  // matrix1 = identity (Rot1 = 0)
  Cm44: 1, Cm48: 0, Cm52: 0, Cm56: 0, Cm60: 1, Cm64: 0, Cm68: 0, Cm72: 0, Cm76: 1,
  // matrix2 = identity (Rot2 = 0)
  Cm80: 1, Cm84: 0, Cm88: 0, Cm92: 0, Cm96: 1, Cm100: 0, Cm104: 0, Cm108: 0, Cm112: 1,
};
const fl = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

let body = fs.readFileSync('h:/tmp/mb3d-decomp/menger3.glsl', 'utf8')
  .split('\n').filter((l) => !l.startsWith('//')).join('\n'); // drop the // consts comment
for (const [k, v] of Object.entries(C)) body = body.replace(new RegExp('\\b' + k + '\\b', 'g'), fl(v));
const leftover = body.match(/\bCm\d+\b/g);
if (leftover) { console.log('UNRESOLVED CONSTS:', [...new Set(leftover)]); process.exit(1); }

const funcGlsl = `
${body}
void formula_DecompMenger3(inout vec4 z, inout float dr, inout float trap, vec4 c) {
  float x = z.x, y = z.y, zc = z.z, w = dr;
  menger3(x, y, zc, w);
  z.xyz = vec3(x, y, zc);
  dr = w;
  trap = min(trap, length(z.xyz));
}`;
const loopBody = 'formula_DecompMenger3(z, dr, trap, c);';

const SIZE = 460;
async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const ctx = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 80 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  const spec: any = {
    id: 'DecompMenger3', formula: 'DecompMenger3', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000,
    configOverrides: { coreMath: { iterations: 16 }, quality: { estimator: 1.0, distanceMetric: 1.0, maxSteps: 400 } },
    cameraOverrides: orbitCamera(2.6, 28, 16),
  };
  const r: any = await page.evaluate(([f, l, s]) => (window as any).runRawFormulaTest(f, l, s), [funcGlsl, loopBody, spec] as any);
  if (!r.ok) {
    console.log('RENDER FAILED:', r.error);
    if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 8).join('\n  '));
  } else {
    fs.writeFileSync('h:/tmp/decomp-menger3.png', Buffer.from(String(r.thumbnailPNG).replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`OK nonBlack=${r.render.nonBlackFraction} sigma=${r.render.sigma} nan=${r.render.nanFraction} compileMs=${r.compile.totalMs} -> h:/tmp/decomp-menger3.png`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
