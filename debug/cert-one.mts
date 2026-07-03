// Single est7 render per fresh browser boot — eliminates the within-session recompile
// ambiguity (compile-gated quality flags only reliably apply on the engine's FIRST boot).
// Headed ANGLE D3D11. Config passed as JSON on argv.
//   npx tsx debug/cert-one.mts '<configOverridesJSON>' <out.png> [formula|MB3D:SceneName]
import * as fs from 'fs';
import { chromium } from 'playwright';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';

const PORT = process.env.PORT || '5173';
const URL = `http://localhost:${PORT}/render-harness.html`;
const SIZE = 380;
const over = JSON.parse(process.argv[2] || '{}');
const out = process.argv[3] || 'h:/tmp/cert-one.png';
const target = process.argv[4] || 'Mandelbulb';

async function main() {
  let mb3dScene: any = null;
  let formula = target;
  if (target.startsWith('MB3D:')) {
    const name = target.slice(5);
    const bin = Buffer.from(MB3D_SAMPLE_SCENES.find((s) => s.name === name)!.b64, 'base64');
    mb3dScene = parseMB3DBinary(new Uint8Array(bin), name);
    formula = '';
  }
  const browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await (await browser.newContext({ viewport: { width: SIZE + 60, height: SIZE + 120 } })).newPage();
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

  const spec = { id: 'one', formula, mode: 'single', size: [SIZE, SIZE], timeoutMs: 90000, configOverrides: over };
  const res: any = mb3dScene
    ? await page.evaluate(async ({ scene, spec }) => await (window as any).runMB3DWeaveTest(scene, spec), { scene: mb3dScene, spec })
    : await page.evaluate(async (spec) => await (window as any).runRenderTest(spec), spec);
  if (res?.thumbnailPNG) fs.writeFileSync(out, Buffer.from(res.thumbnailPNG.replace(/^data:image\/png;base64,/, ''), 'base64'));
  const nb = res?.render?.nonBlackFraction ?? 0, sig = res?.render?.sigma ?? [0, 0, 0], nan = res?.render?.nanFraction ?? 0;
  console.log(`${out}  ok=${res?.ok} nonBlack=${(nb * 100).toFixed(1)}% NaN=${(nan * 100).toFixed(2)}% sigma=[${sig.map((v: number) => v.toFixed(3)).join(',')}] ${res?.error ?? ''}`);
  if (errs.length) errs.slice(0, 4).forEach((e) => console.log('  err: ' + e));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
