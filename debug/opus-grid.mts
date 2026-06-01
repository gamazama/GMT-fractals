/**
 * opus-grid.mts — render N Opus variants, each in a FRESH browser page
 * (avoids the compile-scheduler wedge), then composite to one labeled PNG.
 *
 * Variants are defined inline below. Each: { label, over, cam }.
 * Requires dev server on 5173.
 *   npx tsx debug/opus-grid.mts --tile=300 --out=h:/tmp/opus_grid.png
 */
import * as fs from 'fs';
import { chromium, Browser } from 'playwright';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const PORT = arg('--port', '5173')!;
const TILE = parseInt(arg('--tile', '300')!, 10);
const OUT  = arg('--out', 'h:/tmp/opus_grid.png')!;
const SPECS_PATH = arg('--specs');
const URL  = `http://localhost:${PORT}/render-harness.html`;

// Camera framing shared by all tiles (3.0x pullback of AmazingBox's angle).
const CAM = {
    pos: [0, 0, 0], rot: [-0.235, 0.3667, 0.2665, 0.8598],
    targetDistance: 5.7,
    sceneOffset: { x: 3.9, y: 4.17, z: 12.24, xL: 0, yL: 0, zL: 0 },
};

const DEFAULT_SPECS = [
    { label: 'rot0.2',          over: { coreMath: { paramF: 0.2 } } },
    { label: 'rot0.4',          over: { coreMath: { paramF: 0.4 } } },
    { label: 'rot0.7',          over: { coreMath: { paramF: 0.7 } } },
    { label: 'rot1.0',          over: { coreMath: { paramF: 1.0 } } },
    { label: 'rot0.4 sc2.0',    over: { coreMath: { paramF: 0.4, paramA: 2.0, paramB: 0.5, paramC: 1.0, paramD: 1.0 } } },
    { label: 'rot0.7 sc2.0',    over: { coreMath: { paramF: 0.7, paramA: 2.0, paramB: 0.5, paramC: 1.0, paramD: 1.0 } } },
    { label: 'rot0.4 axisY',    over: { coreMath: { paramF: 0.4, vec3A: { x: 0, y: 1, z: 0 } } } },
    { label: 'rot0.5 axisXZ',   over: { coreMath: { paramF: 0.5, vec3A: { x: 1, y: 0, z: 1 } } } },
    { label: 'rot-0.5',         over: { coreMath: { paramF: -0.5 } } },
];

async function renderTile(browser: Browser, spec: any) {
    const page = await browser.newContext({ viewport: { width: TILE + 40, height: TILE + 60 } }).then(c => c.newPage());
    try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });
        const rspec: any = {
            id: 'g', formula: 'Opus', mode: 'single', size: [TILE, TILE], timeoutMs: 60000,
            configOverrides: spec.over ?? {}, cameraOverrides: spec.cam ?? CAM,
        };
        const r: any = await page.evaluate((s) => (window as any).runRenderTest(s), rspec);
        return { png: r.thumbnailPNG ?? '', nonBlack: r.render?.nonBlackFraction ?? 0, ok: r.ok, error: r.error };
    } finally {
        await page.context().close();
    }
}

async function main() {
    const specs = SPECS_PATH ? JSON.parse(fs.readFileSync(SPECS_PATH, 'utf8')) : DEFAULT_SPECS;
    const browser = await chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--ignore-gpu-blocklist', '--enable-webgl'],
    });
    const tiles: any[] = [];
    for (let i = 0; i < specs.length; i++) {
        const t = await renderTile(browser, specs[i]);
        tiles.push({ label: specs[i].label, ...t });
        console.log(`[${i + 1}/${specs.length}] ${specs[i].label}  ok=${t.ok} nonBlack=${t.nonBlack}${t.ok ? '' : '  ERR=' + (t.error ?? '').slice(0, 120)}`);
    }
    // Composite in a fresh page.
    const page = await browser.newContext({ viewport: { width: 1400, height: 1400 } }).then(c => c.newPage());
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const grid: string = await page.evaluate(async ({ tiles, TILE }) => {
        const cols = Math.ceil(Math.sqrt(tiles.length)), rows = Math.ceil(tiles.length / cols);
        const labelH = 20, pad = 5, cw = TILE + pad * 2, ch = TILE + labelH + pad * 2;
        const cvs = document.createElement('canvas'); cvs.width = cols * cw; cvs.height = rows * ch;
        const ctx = cvs.getContext('2d')!; ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        for (let i = 0; i < tiles.length; i++) {
            const cx = (i % cols) * cw + pad, cy = Math.floor(i / cols) * ch + pad;
            if (tiles[i].png) {
                const img = new Image(); img.src = tiles[i].png;
                await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
                ctx.drawImage(img, cx, cy, TILE, TILE);
            } else { ctx.fillStyle = '#3a0000'; ctx.fillRect(cx, cy, TILE, TILE); }
            ctx.fillStyle = '#e6edf3'; ctx.font = '13px Consolas, monospace';
            ctx.fillText(`${i}: ${tiles[i].label}`, cx + 2, cy + TILE + 14);
        }
        return cvs.toDataURL('image/png');
    }, { tiles, TILE });
    fs.writeFileSync(OUT, Buffer.from(grid.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('wrote ' + OUT);
    await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
