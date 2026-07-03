/**
 * Render a single-slot Menger3 scene through the REAL import path
 * (emitFusedHybrid → decompiled [CODE]). Proves the wired decompiler renders a
 * Menger sponge in-engine. Requires vite:5173.
 */
import * as fs from 'fs';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';

const SIZE = 440;
const menger = {
  iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10,
  optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
  optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Scale 3, CScale 1,1,1, Rot 0
};
const scene = {
  version: 18,
  header: { mandId: 44, width: SIZE, height: SIZE, iterations: 14, iOptions: 0, zoom: 1, fovY: 60, midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 1.89, tilingOptions: 0 },
  title: 'Menger3-decompiled',
  addon: { version: 16, options1: 0, options2: 0, options3: 0, formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [menger] },
  raw: [] as any,
};

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 80 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  const spec: any = {
    id: 'Menger3Import', formula: 'x', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000,
    configOverrides: { quality: { maxSteps: 500 } },
    cameraOverrides: orbitCamera(2.6, 28, 16),
  };
  const r: any = await page.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any);
  if (!r.ok) { console.log('FAILED:', r.error); if (errors.length) console.log(errors.slice(0, 6).join('\n')); }
  else {
    fs.writeFileSync('h:/tmp/menger3-import.png', Buffer.from(String(r.thumbnailPNG).replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`OK nonBlack=${r.render.nonBlackFraction} nan=${r.render.nanFraction} compileMs=${r.compile.totalMs} -> h:/tmp/menger3-import.png`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
