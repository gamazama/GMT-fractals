import * as fs from 'fs';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';

const code = JSON.parse(fs.readFileSync('h:/GMT/workspace-gmt/dev/public/formulas/dec.json', 'utf8'))
    .find((e: any) => e.id === 'fractal_de').code;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newContext({ viewport: { width: 340, height: 360 } }).then(c => c.newPage());
const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:5173/render-harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });
for (const d of [3, 6, 12, 24]) {
    const cam = orbitCamera(d, 30, 20);
    const spec: any = { id: 'dec', formula: 'frag_dec_' + d, fragSource: code, pipeline: 'v3', mode: 'single', size: [288, 288], timeoutMs: 45000, cameraOverrides: cam };
    const r: any = await page.evaluate((s) => (window as any).runFragRenderTest(s), spec);
    if (r.ok && r.thumbnailPNG) fs.writeFileSync(`h:/tmp/dec_d${d}.png`, Buffer.from(String(r.thumbnailPNG).replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('dist', d, 'ok', r.ok, 'nonBlack', r.render?.nonBlackFraction, 'sigma', JSON.stringify(r.render?.sigma), r.ok ? '' : ('ERR ' + (r.error || errs[0] || '').slice(0, 140)));
}
await browser.close();
