/**
 * Render real cloned MB3D scenes (M3Parameter/*.m3p) through our importer.
 * Requires: npx vite --port 5173
 * Usage: npx tsx debug/probe-mb3d-scene-shot.mts [--dist=5] [--size=420]
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D';

function arg(flag: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(flag + '='));
  return hit ? hit.slice(flag.length + 1) : def;
}
const SIZE = parseInt(arg('--size', '420'), 10);
const DIST = parseFloat(arg('--dist', '5'));
const DIR = 'h:/tmp/mb3d-src/M3Parameter';
const URL = `http://localhost:5173/render-harness.html`;

const SCENES = [
  { file: 'spineJulia.m3p', out: 'h:/tmp/scene-intpow.png', label: 'Integer Power (spineJulia)' },
  { file: 'ABoxScale2Start.m3p', out: 'h:/tmp/scene-abox.png', label: 'Amazing Box (ABoxScale2Start)' },
  { file: 'QuatP4hybridJulia.m3p', out: 'h:/tmp/scene-quat.png', label: 'Quaternion (QuatP4hybridJulia)' },
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

  for (const s of SCENES) {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(DIR, s.file))), s.file);
    const json = { ...scene, raw: [] as any }; // drop bytes for JSON transport
    const spec: any = { id: s.file, formula: 'x', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000, cameraOverrides: orbitCamera(DIST, 35, 20) };
    const result: any = await page.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [json, spec] as any);
    if (!result.ok) { console.log(`${s.label}: FAILED — ${result.error}`); continue; }
    const b64 = String(result.thumbnailPNG).replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(s.out, Buffer.from(b64, 'base64'));
    console.log(`${s.label}: nonBlack=${result.render.nonBlackFraction} sigma=${result.render.sigma} nan=${result.render.nanFraction} iters=${scene.header.iterations} julia=${scene.header.isJulia} -> ${s.out}`);
  }
  if (errors.length) console.log('PAGE ERRORS:\n  ' + errors.slice(0, 6).join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
