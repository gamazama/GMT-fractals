// Real-GPU verification for the rebuilt Numerical DE (estimator 7) — S-numeric-de / ADR-0085.
// Renders to the REAL GPU (ANGLE d3d11, non-headless) via the render-harness.
//   1. DsyneGrafix canary: analytic est-2 "dust" baseline, then est-7 at probe multipliers
//      {0.4, 1.0, 2.5} — the rings must render smooth WITHOUT retuning a probe (proof the
//      param-sensitivity is gone — magnitude is probe-invariant).
//   2. The 6 dr-gap scenes on est-7 (numDEeps 1.0): Melting, Oxnot, Jost1, HalTenny FoN,
//      Hal-Tenny Resistance, Recycledrelatives — should form (un-black) on the numeric DE.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const OUT = 'h:/tmp/numeric-de-rebuild';
fs.mkdirSync(OUT, { recursive: true });
const PORT = 3400;

const pick = (needle: string) => {
  const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(needle.toLowerCase()));
  if (!s) throw new Error(`scene not found: ${needle}`);
  return parseMB3DBinary(decodeSampleScene(s.b64), s.name);
};

// tag, scene-needle, quality overrides
type Job = { tag: string; needle: string; q: Record<string, number> };
const jobs: Job[] = [
  // Canary: analytic dust baseline, then numeric at three probe multipliers.
  { tag: 'dsyne_est2_dust', needle: 'dsyne', q: { estimator: 2 } },
  { tag: 'dsyne_est7_np0.4', needle: 'dsyne', q: { estimator: 7, numDEeps: 0.4 } },
  { tag: 'dsyne_est7_np1.0', needle: 'dsyne', q: { estimator: 7, numDEeps: 1.0 } },
  { tag: 'dsyne_est7_np2.5', needle: 'dsyne', q: { estimator: 7, numDEeps: 2.5 } },
  // The 6 dr-gap scenes on the rebuilt numeric estimator (auto probe).
  { tag: 'melting_est7', needle: 'Melting spot', q: { estimator: 7 } },
  { tag: 'oxnot_est7', needle: 'Oxnot', q: { estimator: 7 } },
  { tag: 'jost1_est7', needle: 'Jost1', q: { estimator: 7 } },
  { tag: 'haltenny_fon_est7', needle: 'Freak Of Nature', q: { estimator: 7 } },
  { tag: 'haltenny_resistance_est7', needle: 'Resistance', q: { estimator: 7 } },
  { tag: 'recycled_est7', needle: 'Recycledrelatives', q: { estimator: 7 } },
];

const b = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', () => {});
await pg.goto(`http://localhost:${PORT}/render-harness.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForFunction(() => !!(window as any).runMB3DWeaveTest, { timeout: 60000 });

console.log(`Numeric-DE rebuild verification → ${OUT}\n`);
for (const job of jobs) {
  const scene = pick(job.needle);
  let w = scene.header.width || 480, h = scene.header.height || 360;
  const sc = 400 / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc);
  const spec = {
    id: scene.title || job.tag, mode: 'single', size: [w, h], timeoutMs: 120000, imageFormat: 'png',
    configOverrides: { quality: job.q, atmosphere: { fogIntensity: 0 } },
  };
  let r: any = {};
  try { r = await pg.evaluate(([sc, sp]) => (window as any).runMB3DWeaveTest(sc, sp), [scene, spec] as any); }
  catch (e: any) { r = { error: String(e?.message ?? e) }; }
  const nb = r?.render?.nonBlackFraction ?? 0;
  const nan = r?.render?.nanFraction ?? 0;
  const url = r?.thumbnailPNG || r?.imageDataUrl;
  if (url) fs.writeFileSync(`${OUT}/${job.tag}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${job.tag.padEnd(28)} ${w}x${h}  nonBlack=${nb.toFixed(3)} nan=${nan.toFixed(3)}${r.error ? '  ERR ' + r.error.slice(0, 60) : ''}`);
}
await b.close();
console.log(`\nPNGs → ${OUT}`);
