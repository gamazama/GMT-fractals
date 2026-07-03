/**
 * Verify MB3D camera-pose import: render asymmetric scenes through the importer
 * using the MAPPED camera (no orbit override), plus a NON-FLIPPED comparison, so
 * the Z-flip can be checked for mirroring. Requires: npx vite --port 5173.
 * Usage: npx tsx debug/probe-mb3d-campose.mts [--size=480]
 */
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { chromium } from 'playwright';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D';
import { mapMB3DCamera } from '../engine-gmt/utils/mb3d/mapCamera';

function arg(flag: string, def: string): string {
  const hit = process.argv.find((a) => a.startsWith(flag + '='));
  return hit ? hit.slice(flag.length + 1) : def;
}
const SIZE = parseInt(arg('--size', '480'), 10);
const DIR = 'h:/tmp/mb3d-src/M3Parameter';
const URL = `http://localhost:5173/render-harness.html`;

const SCENES = ['spineJulia.m3p', 'TreePlanet.m3p', 'Surreal shell.m3p', 'AureliusCat - Bamboo.m3p', 'BatJorge - Pong 703 - Swirls.m3p'];

/** Non-flipped pose: same view-basis math but WITHOUT negating world Z (the
 *  mirror-candidate, to compare against the shipped flip in mapMB3DCamera). */
function noFlipPose(h: any) {
  const { zoom, midX, midY, midZ, wRotX, wRotY, wRotZ, dZstart } = h;
  const sx = Math.sin(wRotX), cx = Math.cos(wRotX);
  const sy = Math.sin(wRotY), cy = Math.cos(wRotY);
  const sz = Math.sin(wRotZ), cz = Math.cos(wRotZ);
  const axis = (s: number[]) => {
    let [x1, y1, z1] = s;
    const x2 = x1, y2 = cx * y1 + sx * z1, z2 = cx * z1 - sx * y1;
    x1 = cy * x2 + sy * z2; y1 = y2; z1 = cy * z2 - sy * x2;
    return [cz * x1 + sz * y1, cz * y1 - sz * x1, z1];
  };
  const F = axis([0, 0, 1]), U = axis([0, 1, 0]);
  const dist = midZ - dZstart;
  const cam = new THREE.Vector3(midX - F[0] * dist, midY - F[1] * dist, midZ - F[2] * dist);
  const piv = new THREE.Vector3(midX, midY, midZ);
  const up = new THREE.Vector3(U[0], U[1], U[2]);
  const m = new THREE.Matrix4().lookAt(cam, piv, up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { pos: [cam.x, cam.y, cam.z], rot: [q.x, q.y, q.z, q.w], targetDistance: dist };
}

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const ctx = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 80 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  for (const file of SCENES) {
    const scene = parseMB3DBinary(new Uint8Array(fs.readFileSync(path.join(DIR, file))), file);
    const json = { ...scene, raw: [] as any };
    const cam = mapMB3DCamera(scene.header as any);
    const base = file.replace(/\.m3p$/i, '').replace(/[^\w]+/g, '_');
    console.log(`\n${file}: zoom=${scene.header.zoom.toFixed(2)} fovY=${scene.header.fovY} midZ=${scene.header.midZ.toFixed(3)} dZstart=${scene.header.dZstart.toFixed(3)} dist=${cam.targetDistance.toFixed(3)}`);

    // (A) shipped mapped camera (flip Z) — no override so the def's preset camera is used.
    const specA: any = { id: file + '#flip', formula: 'x', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000 };
    // (B) non-flipped comparison via cameraOverrides.
    const nf = noFlipPose(scene.header);
    const specB: any = { id: file + '#noflip', formula: 'x', mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000, cameraOverrides: { pos: nf.pos, rot: nf.rot, targetDistance: nf.targetDistance } };

    for (const [tag, spec] of [['flip', specA], ['noflip', specB]] as const) {
      const r: any = await page.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [json, spec] as any);
      if (!r.ok) { console.log(`  [${tag}] FAILED — ${r.error}`); continue; }
      const out = `h:/tmp/campose-${base}-${tag}.png`;
      fs.writeFileSync(out, Buffer.from(String(r.thumbnailPNG).replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log(`  [${tag}] nonBlack=${r.render.nonBlackFraction.toFixed(3)} sigma=${(Array.isArray(r.render.sigma) ? r.render.sigma.reduce((a: number, b: number) => a + b, 0) : 0).toFixed(0)} -> ${out}`);
    }
  }
  if (errors.length) console.log('\nPAGE ERRORS:\n  ' + errors.slice(0, 6).join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
