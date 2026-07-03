// Diagnose est7 Mandelbulb on the REAL GPU: sweep numDEeps (and detail) to tell overshoot
// (lower numDEeps recovers the surface) from structural (nothing does). Headed ANGLE D3D11.
import * as fs from 'fs';
import { chromium } from 'playwright';

const arg = (f: string, d?: string) => process.argv.find((a) => a.startsWith(f + '='))?.slice(f.length + 1) ?? d;
const PORT = arg('--port', '5173')!;
const URL = `http://localhost:${PORT}/render-harness.html`;
const SIZE = 360;
const FORMULA = arg('--formula', 'Mandelbulb')!;
const savePng = (u: string, o: string) => fs.writeFileSync(o, Buffer.from(u.replace(/^data:image\/png;base64,/, ''), 'base64'));

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await (await browser.newContext({ viewport: { width: SIZE + 60, height: SIZE + 120 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  async function shot(label: string, over: any, out: string) {
    const res: any = await page.evaluate(async (spec) => await (window as any).runRenderTest(spec),
      { id: label, formula: FORMULA, mode: 'single', size: [SIZE, SIZE], timeoutMs: 60000, configOverrides: over });
    if (res?.thumbnailPNG) savePng(res.thumbnailPNG, out);
    // richer metric: mean luminance (a solid fill is bright; a miss→bg is dark; structure is mid)
    const nb = res?.render?.nonBlackFraction ?? 0;
    const sig = res?.render?.sigma ?? [0, 0, 0];
    console.log(`  ${label.padEnd(28)} ok=${res?.ok} nonBlack=${(nb * 100).toFixed(1)}% sigmaG=${(sig[1] ?? 0).toFixed(4)} ${res?.error ?? ''} → ${out}`);
  }

  // est7 PAIRED WITH the MB3D-faithful marcher (Lipschitz clamp + StepDiv), the intended combo.
  const F = (np: number, extra: any = {}) => ({ quality: { estimator: 7, numDEeps: np, detail: 1.5, maxSteps: 300, mb3dFaithful: true, mb3dStepDiv: 0.3, mb3dDEsub: 0.0, ...extra }, coreMath: { iterations: 60 } });
  console.log(`\n=== ${FORMULA} est7 + FAITHFUL marcher — numDEeps sweep (detail 1.5, iter 60, stepDiv 0.3) ===`);
  for (const k of [0.3, 0.1, 0.03, 0.01]) {
    await shot(`est7f-np${k}`, F(k), `h:/tmp/sweep-${FORMULA}-f-np${k}.png`);
  }
  console.log(`\n=== ${FORMULA} est7 (NO faithful marcher) control ===`);
  await shot('est7-nofaithful', { quality: { estimator: 7, numDEeps: 0.1, detail: 1.5, maxSteps: 300 }, coreMath: { iterations: 60 } }, `h:/tmp/sweep-${FORMULA}-nofaithful.png`);
  console.log(`\n=== ${FORMULA} est7 + faithful — stepDiv/DEsub probes (numDEeps 0.1) ===`);
  await shot('est7f-stepdiv0.1', F(0.1, { mb3dStepDiv: 0.1 }), `h:/tmp/sweep-${FORMULA}-f-sd01.png`);
  await shot('est7f-ms800', F(0.1, { maxSteps: 800 }), `h:/tmp/sweep-${FORMULA}-f-ms800.png`);

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
