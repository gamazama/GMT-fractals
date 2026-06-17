/**
 * opus-sheet.mts — render a set of Opus variants into ONE labeled contact-sheet PNG.
 *
 * Drives debug/render-harness.ts. Each entry renders through the real engine;
 * thumbnails are composited into a grid (with labels + sigma) inside the page,
 * then the grid is saved so all variants can be compared at a glance.
 *
 * Requires dev server: npx vite --port 5173
 * Usage: npx tsx debug/opus-sheet.mts [--tile=320] [--out=h:/tmp/opus_sheet.png] [--specs=path.json]
 */
import * as fs from 'fs';
import { chromium } from 'playwright';

function arg(flag: string, def?: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const PORT = arg('--port', '5173')!;
const TILE = parseInt(arg('--tile', '340')!, 10);
const OUT  = arg('--out', 'h:/tmp/opus_sheet.png')!;
const SPECS_PATH = arg('--specs');
const URL  = `http://localhost:${PORT}/render-harness.html`;

// Default variant set — overridden by --specs=<json file> (array of {label, over, cam}).
const DEFAULT_SPECS = [
    { label: 'Marble rot.62 comp0',   over: { coreMath: { paramD: 0, paramF: 0.62, paramE: 0.0, vec3B: { x: 0, y: 0, z: 0 } } } },
    { label: 'Marble rot.62 comp.12', over: { coreMath: { paramD: 0, paramF: 0.62, vec3B: { x: 0.12, y: 0, z: 0 } } } },
    { label: 'Marble rot1.0 comp.08', over: { coreMath: { paramD: 0, paramF: 1.0,  vec3B: { x: 0.08, y: 0, z: 0 } } } },
    { label: 'Coral rot.6 comp0',     over: { coreMath: { paramD: 1, paramF: 0.6,  paramA: 2.0, paramB: 0.35, vec3C: { x: 0.04, y: -1.3, z: 0.04 }, vec3B: { x: 0, y: 0, z: 0 } } } },
    { label: 'Coral rot.6 comp.1',    over: { coreMath: { paramD: 1, paramF: 0.6,  paramA: 2.0, paramB: 0.35, vec3C: { x: 0.04, y: -1.3, z: 0.04 }, vec3B: { x: 0.1, y: 0, z: 0 } } } },
    { label: 'Bloom extra1.6',        over: { coreMath: { paramD: 2, paramF: 0.5,  paramA: 2.0, paramB: 0.5, paramC: 1.0, paramE: 1.6, vec3B: { x: 0, y: 0, z: 0 } } } },
    { label: 'Bloom extra2.2 comp.08',over: { coreMath: { paramD: 2, paramF: 0.5,  paramA: 2.0, paramB: 0.5, paramC: 1.0, paramE: 2.2, vec3B: { x: 0.08, y: 0, z: 0 } } } },
    { label: 'Shells extra.3',        over: { coreMath: { paramD: 3, paramF: 0.5,  paramA: 2.0, paramB: 0.5, paramE: 0.3, vec3B: { x: 0, y: 0, z: 0 } } } },
];

async function main() {
    const specs = SPECS_PATH ? JSON.parse(fs.readFileSync(SPECS_PATH, 'utf8')) : DEFAULT_SPECS;
    const browser = await chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--ignore-gpu-blocklist', '--enable-webgl'],
    });
    const page = await browser.newContext({ viewport: { width: 900, height: 900 } }).then(c => c.newPage());
    const errors: string[] = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

    const tiles: { label: string; png: string; sigma: number[]; nonBlack: number; ok: boolean; error?: string }[] = [];
    for (let i = 0; i < specs.length; i++) {
        const s = specs[i];
        const spec: any = {
            id: `opus-${i}`, formula: 'Opus', mode: 'single',
            size: [TILE, TILE], timeoutMs: 60000,
            configOverrides: s.over ?? {},
        };
        if (s.cam) spec.cameraOverrides = s.cam;
        const r: any = await page.evaluate((sp) => (window as any).runRenderTest(sp), spec);
        tiles.push({
            label: s.label, png: r.thumbnailPNG ?? '', sigma: r.render?.sigma ?? [0, 0, 0],
            nonBlack: r.render?.nonBlackFraction ?? 0, ok: r.ok, error: r.error,
        });
        console.log(`[${i + 1}/${specs.length}] ${s.label}  ok=${r.ok} sigma=${JSON.stringify(r.render?.sigma)} nonBlack=${r.render?.nonBlackFraction}${r.ok ? '' : '  ERR=' + r.error}`);
    }

    // Composite grid inside the page.
    const gridDataUrl: string = await page.evaluate(async ({ tiles, TILE }) => {
        const cols = Math.ceil(Math.sqrt(tiles.length));
        const rows = Math.ceil(tiles.length / cols);
        const labelH = 22, pad = 6;
        const cellW = TILE + pad * 2, cellH = TILE + labelH + pad * 2;
        const cvs = document.createElement('canvas');
        cvs.width = cols * cellW; cvs.height = rows * cellH;
        const ctx = cvs.getContext('2d')!;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        for (let i = 0; i < tiles.length; i++) {
            const cx = (i % cols) * cellW + pad, cy = Math.floor(i / cols) * cellH + pad;
            const t = tiles[i];
            if (t.png) {
                const img = new Image(); img.src = t.png;
                await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
                ctx.drawImage(img, cx, cy, TILE, TILE);
            } else {
                ctx.fillStyle = '#3a0000'; ctx.fillRect(cx, cy, TILE, TILE);
            }
            ctx.fillStyle = '#c9d1d9'; ctx.font = '13px Consolas, monospace';
            ctx.fillText(`${i}: ${t.label}`, cx + 2, cy + TILE + 15);
        }
        return cvs.toDataURL('image/png');
    }, { tiles, TILE });

    fs.writeFileSync(OUT, Buffer.from(gridDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('wrote ' + OUT);
    if (errors.length) console.error('page errors:\n  ' + errors.slice(0, 6).join('\n  '));
    await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
