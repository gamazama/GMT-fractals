/**
 * probe-mb3d-fused-shot.mts — render the MB3D fused-hybrid weave to PNGs.
 *
 * Builds an all-intern demo scene (Amazing Box ×2 + Real Power ×1) plus the two
 * pure components, renders each via window.runMB3DWeaveTest, and writes PNGs so
 * the woven result can be eyeballed and compared. Requires: npx vite --port 5173
 *
 * Usage: npx tsx debug/probe-mb3d-fused-shot.mts [--dist=5] [--size=480]
 */
import * as fs from 'fs';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';

function arg(flag: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(flag + '='));
  return hit ? hit.slice(flag.length + 1) : def;
}
const PORT = '5173';
const SIZE = parseInt(arg('--size', '480'), 10);
const DIST = parseFloat(arg('--dist', '5'));
const URL = `http://localhost:${PORT}/render-harness.html`;

function slot(iterCount: number, formulaIndex: number, optionValues: number[]) {
  const ov = [...optionValues, ...new Array(16).fill(0)].slice(0, 16);
  return { iterCount, formulaIndex, optionCount: optionValues.length, name: '', optionTypes: new Array(16).fill(0), optionValues: ov };
}
function scene(slots: any[]) {
  return {
    version: 18,
    header: { mandId: 44, width: SIZE, height: SIZE, iterations: 24, iOptions: 0, zoom: 1, fovY: 60, midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 1.89, tilingOptions: 0 },
    title: 'WeaveProbe',
    addon: { version: 16, options1: 0, options2: 0, options3: 0, formulaCount: slots.length, hybOpt1: 0, hybOpt2: 0, slots },
    raw: [],
  };
}

const ABOX = (n: number) => slot(n, 4, [-1.5, 0.5, 1]);   // Amazing Box: Scale -1.5, MinR .5, Fold 1
const BULB = (n: number) => slot(n, 1, [8, 1]);            // Real Power: power 8, Zmul 1

const cases = [
  { id: 'fused', label: 'FUSED (ABox×2 + Bulb×1)', sc: scene([ABOX(2), BULB(1)]), out: 'h:/tmp/mb3d-fused.png' },
  { id: 'pure-box', label: 'pure Amazing Box', sc: scene([ABOX(1)]), out: 'h:/tmp/mb3d-pure-box.png' },
  { id: 'pure-bulb', label: 'pure Real Power', sc: scene([BULB(1)]), out: 'h:/tmp/mb3d-pure-bulb.png' },
];

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const ctx = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 80 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  for (const c of cases) {
    const spec: any = { id: c.id, formula: 'x', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000, cameraOverrides: orbitCamera(DIST, 35, 20) };
    const result: any = await page.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [c.sc, spec] as any);
    if (!result.ok) {
      console.log(`${c.label}: FAILED — ${result.error}`);
      continue;
    }
    const b64 = String(result.thumbnailPNG).replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(c.out, Buffer.from(b64, 'base64'));
    console.log(`${c.label}: nonBlack=${result.render.nonBlackFraction} sigma=${result.render.sigma} nan=${result.render.nanFraction} compileMs=${result.compile.totalMs} -> ${c.out}`);
  }
  if (errors.length) console.log('PAGE ERRORS:\n  ' + errors.slice(0, 8).join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
