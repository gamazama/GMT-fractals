/**
 * P4.1 native-weave canary — renders NATIVE dispatcher-slot weaves on the real
 * GPU through the render harness (runMB3DWeaveTest → emitFusedHybrid → real
 * engine compile → PNG). Three shots:
 *   1. ref        — plain native Mandelbulb (baseline for the eye)
 *   2. pair       — the IDENTITY-PAIR canary: Mandelbulb woven with itself,
 *                   alternating 1/1. With identical params it must render
 *                   ≈ the plain bulb (namespace prefixing proven on the GPU).
 *   3. bulb-box   — Mandelbulb ⊗ AmazingBox (two different native slots) —
 *                   the machinery visibly weaving.
 *   4. mixed      — native Mandelbulb ⊗ MB3D intern Amazing Box (#4): both slot
 *                   KINDS in one dispatcher (the P4.2 gate).
 *
 * Requires the dev server (any port serving render-harness.html; default 3400)
 * and a HEADED Chromium for the real ANGLE/D3D11 GPU (never SwiftShader).
 *
 *   npx tsx debug/probe-native-weave.mts [--port=3400] [--pair=A,B] [--iters=30]
 *
 * Output: debug/scratch/native-weave/*.png + console nb/sigma per shot.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const argVal = (f: string) => process.argv.find((a) => a.startsWith(f + '='))?.split('=')[1];
const PORT = argVal('--port') ?? '3400';
const ITERS = parseInt(argVal('--iters') ?? '30', 10);
const PAIR = (argVal('--pair') ?? 'Mandelbulb,Mandelbulb').split(',');

const OUT = 'debug/scratch/native-weave';
fs.mkdirSync(OUT, { recursive: true });

const nslot = (iterCount: number, formula: string) =>
  ({ iterCount, formulaIndex: -1, name: formula, optionCount: 0, optionTypes: [], optionValues: [] });

const header = {
  mandId: 0, width: 640, height: 480, iterations: ITERS, iOptions: 0, bNewOptions: 0,
  zoom: 1, fovY: 0, dZstart: 0, dZend: 0, midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0,
  hVGrads: [], isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 18, tilingOptions: 0,
  rStop: 0, deStop: 0, zStepDiv: 0, stepsAfterDEStop: 0,
  srAmount: 0, srOptions: 0, srReflectionCount: 0,
  lights: [], roughnessFactor: 0, tbpos: [], tbOptions: 0,
  ambCol: '', ambCol2: '', depthCol: '', depthCol2: '', dynFog: '', colStops: [],
};
const weaveScene = (slots: any[], title: string) => ({
  version: 18, header, title, raw: new Uint8Array(0),
  addon: { version: 0, options1: 0, options2: 0, options3: 0, formulaCount: slots.length, hybOpt1: 0, hybOpt2: 0, slots },
});

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto(`http://localhost:${PORT}/render-harness.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

const mb3dInternBox = (iterCount: number) => ({
  iterCount, formulaIndex: 4, name: '',
  optionCount: 3, optionTypes: [0, 0, 0], optionValues: [2, 0.5, 1], // Scale, MinR, Fold
});
const shots: Array<{ id: string; scene?: any; formula?: string }> = [
  { id: 'ref-mandelbulb', formula: 'Mandelbulb' },
  { id: 'pair-identity', scene: weaveScene([nslot(1, PAIR[0]), nslot(1, PAIR[1] ?? PAIR[0])], `Canary ${PAIR.join('+')}`) },
  { id: 'bulb-box', scene: weaveScene([nslot(1, 'Mandelbulb'), nslot(1, 'AmazingBox')], 'Canary bulb+box') },
  { id: 'mixed-native-mb3d', scene: weaveScene([nslot(2, 'Mandelbulb'), mb3dInternBox(1)], 'Canary mixed') },
];

for (const s of shots) {
  const spec = { id: s.id, formula: s.formula ?? '', mode: 'single', size: [480, 480], timeoutMs: 90000, imageFormat: 'png' };
  let r: any = {};
  try {
    r = s.scene
      ? await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [s.scene, spec] as any)
      : await pg.evaluate((sp) => (window as any).runRenderTest(sp), spec as any);
  } catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  if (url) fs.writeFileSync(`${OUT}/${s.id}.png`, Buffer.from(url.split(',')[1], 'base64'));
  const nb = r?.render?.nonBlackFraction;
  console.log(`${s.id.padEnd(16)} ok=${r?.ok} nb=${nb !== undefined ? nb.toFixed(3) : '-'} sigma=${JSON.stringify(r?.render?.sigma)} compileMs=${r?.compile?.totalMs ?? '-'} ${r?.error ?? ''}`);
}
await b.close();
