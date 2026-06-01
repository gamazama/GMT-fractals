/**
 * opus-shot.mts — render Opus (or any formula) to a real PNG via the render harness.
 *
 * Drives debug/render-harness.ts (window.runRenderTest) in headless Chromium
 * against the running vite dev server, then writes the PNG to disk so it can be
 * viewed. This is how Opus gets looked at with real eyes, not guessed at.
 *
 * Requires dev server: npx vite --port 5173
 *
 * Usage:
 *   npx tsx debug/opus-shot.mts                         # default Opus preset, 640x640
 *   npx tsx debug/opus-shot.mts --formula=Opus --size=800 --out=h:/tmp/opus.png
 *   npx tsx debug/opus-shot.mts --over='{"coreMath":{"paramA":7}}'  # config overrides
 *   npx tsx debug/opus-shot.mts --cam='{"targetDistance":3.0}'
 *   npx tsx debug/opus-shot.mts --pt                    # path-traced single shot
 */
import * as fs from 'fs';
import { chromium } from 'playwright';
import { orbitCamera } from './opus-cam';

function arg(flag: string, def?: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}

const PORT     = arg('--port', '5173')!;
const FORMULA  = arg('--formula', 'Opus')!;
const SIZE     = parseInt(arg('--size', '640')!, 10);
const OUT      = arg('--out', `h:/tmp/opus_shot.png`)!;
const OVER     = arg('--over');           // JSON configOverrides
const CAM      = arg('--cam');            // JSON cameraOverrides
const ORBIT    = arg('--orbit');          // "dist,az,el" — orbit the origin
const PT       = process.argv.includes('--pt');   // path-tracing single-shot
const URL      = `http://localhost:${PORT}/render-harness.html`;

async function main() {
    const browser = await chromium.launch({
        args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
            '--enable-webgl',
        ],
    });
    const ctx = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 80 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

    const spec: any = {
        id: `${FORMULA}-shot`,
        formula: FORMULA,
        mode: 'single',
        size: [SIZE, SIZE],
        timeoutMs: 60000,
    };
    if (OVER) spec.configOverrides = JSON.parse(OVER);
    if (CAM)  spec.cameraOverrides = JSON.parse(CAM);
    if (ORBIT) {
        const [d, a, e] = ORBIT.split(',').map(Number);
        spec.cameraOverrides = orbitCamera(d, a, e);
    }
    if (PT)   spec.configOverrides = { ...(spec.configOverrides ?? {}), lighting: { ...(spec.configOverrides?.lighting ?? {}), renderMode: 1.0, ptEnabled: true } };

    const result: any = await page.evaluate((s) => (window as any).runRenderTest(s), spec);

    if (!result.ok) {
        console.error('RENDER FAILED:', result.error);
        if (errors.length) console.error('page errors:\n  ' + errors.join('\n  '));
        await browser.close();
        process.exit(1);
    }

    const b64 = String(result.thumbnailPNG).replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));

    console.log(JSON.stringify({
        out: OUT,
        formula: FORMULA,
        size: SIZE,
        sigma: result.render.sigma,
        nonBlackFraction: result.render.nonBlackFraction,
        nanFraction: result.render.nanFraction,
        compileMs: result.compile.totalMs,
        timeMs: result.timeMs,
    }, null, 2));

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
