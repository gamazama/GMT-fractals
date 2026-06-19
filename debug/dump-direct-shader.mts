/**
 * Dump the live-assembled DIRECT fragment shader (Raymarched reflections) for the
 * heavy-inline census — the Direct twin of dump-pt-shader.mts. Forces the maximal
 * Direct variant (raymarched reflections + bounce shadows + soft shadows + AO +
 * Cook-Torrance) so the reflection march + its surface re-shade are all present.
 *
 * Usage (vite must be running on :3400):
 *   npx tsx debug/dump-direct-shader.mts
 *   OUT=h:/tmp/direct.frag npx tsx debug/dump-direct-shader.mts
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { createConnection } from 'net';

const BASE_URL = process.env.ENGINE_URL ?? 'http://localhost:3400';
const APP_URL = BASE_URL + '/app-gmt.html';
const OUT = process.env.OUT ?? 'h:/tmp/direct-raymarch.frag';
const TIMEOUT = 90_000;

async function waitForPort(url: string, deadlineMs: number) {
    const m = url.match(/:(\d+)/); const port = m ? parseInt(m[1], 10) : 80;
    const t0 = Date.now();
    while (Date.now() - t0 < deadlineMs) {
        const ok = await new Promise<boolean>((res) => {
            const s = createConnection({ host: 'localhost', port });
            s.once('connect', () => { s.destroy(); res(true); });
            s.once('error', () => res(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`dev server never came up at ${url}`);
}

console.log('[dump-direct] waiting for dev server at', BASE_URL);
await waitForPort(BASE_URL, 120_000);

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.on('pageerror', (e) => console.error('[dump-direct] PAGEERROR:', e.message));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', { timeout: TIMEOUT, polling: 100 });
console.log('[dump-direct] booted');

await page.evaluate(`(async () => {
  const st = window.__store.getState(); const p = window.__gmtProxy;
  st.setLighting({ ptEnabled: false, advancedLighting: true, specularModel: 1.0, shadows: true, shadowsCompile: true, shadowAlgorithm: 0.0, ptStochasticShadows: true, areaLights: true });
  if (st.setReflections) st.setReflections({ enabled: true, reflectionMode: 3.0, bounceShadows: true, bounces: 1 });
  if (st.setAo) st.setAo({ aoEnabled: true, aoStochasticCp: true });
  st.setRenderMode('Direct');
  const t0 = performance.now(); while (performance.now() - t0 < 8000 && !p.isCompiling) await new Promise(r => setTimeout(r, 4));
  const ts = performance.now(); while (p.isCompiling && performance.now() - ts < 120000) await new Promise(r => setTimeout(r, 4));
})()`);

const frag = await page.evaluate('window.__gmtProxy._lastGeneratedFrag') as string;
if (!frag || frag.length < 1000) throw new Error('no shader captured (len=' + (frag?.length ?? 0) + ')');
writeFileSync(OUT, frag);
console.log(`[dump-direct] wrote ${OUT} (${frag.length} bytes, ${frag.split('\n').length} lines)`);
await browser.close();
