/**
 * frag-retry-singlecolor.mts — find single-color frag renders and retry them
 * with a camera headlight + several z-offsets (orbit distances), keeping the
 * most colourful result.
 *
 * Phase A — DETECT: load every PNG in the gallery dir into a browser canvas,
 *   compute per-channel std-dev + unique-ish colour spread; flag "single colour"
 *   (flat) renders. Copy flagged originals into <dir>/_singlecolor/<name>.orig.png.
 * Phase B — RETRY: for each flagged formula, re-render through the engine with
 *   a FIXED light at the camera (headlight) across several orbit distances; keep
 *   the highest-variance frame, write it to <dir>/_singlecolor/<name>.png.
 *
 * Requires dev server on 5173 and the catalog/frag sources (same as frag-gallery).
 * Run AFTER the main batches finish (shares the browser/engine).
 *
 * Usage: npx tsx debug/frag-retry-singlecolor.mts [--dir=debug/scratch/frag-gallery]
 *        [--threshold=6] [--dists=4,8,16,28] [--concurrency=3] [--detect-only]
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser } from 'playwright';
import { orbitCamera } from './opus-cam';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const PORT      = arg('--port', '5173')!;
const DIR       = arg('--dir', 'debug/scratch/frag-gallery')!;
const THRESH    = parseFloat(arg('--threshold', '6')!);   // mean per-channel std-dev below this = single colour
const DISTS     = (arg('--dists', '4,8,16,28')!).split(',').map(Number);
const CONC      = parseInt(arg('--concurrency', '3')!, 10);
const DETECT_ONLY = process.argv.includes('--detect-only');
const SIZE      = parseInt(arg('--size', '288')!, 10);
const URL       = `http://localhost:${PORT}/render-harness.html`;
const SC_DIR    = path.join(DIR, '_singlecolor');

const ROOT     = 'h:/GMT/workspace-gmt/dev';
const CATALOG  = path.join(ROOT, 'public/formulas/v3-v4-catalog.json');
const REF_BASE = path.join(ROOT, 'engine-gmt/features/fragmentarium_import/reference/Examples');
const REF_ALT  = path.join(ROOT, 'engine-gmt/features/fragmentarium_import/reference');
const DEC_JSON = path.join(ROOT, 'public/formulas/dec.json');

const DEC_MAP: Record<string, string> = (() => {
    try { const a = JSON.parse(fs.readFileSync(DEC_JSON, 'utf8')); const m: any = {}; for (const e of a) if (e?.id && e?.code) m[e.id] = e.code; return m; } catch { return {}; }
})();
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

function safeName(id: string) { return id.replace(/[^a-zA-Z0-9_.-]/g, '_'); }
// reverse: PNG filename (safeName of id) -> catalog id
const NAME_TO_ID: Record<string, string> = {};
for (const id of Object.keys(catalog.byId)) NAME_TO_ID[safeName(id)] = id;

function resolveFrag(id: string): string | null {
    if (DEC_MAP[id]) return null; // inline
    for (const p of [path.join(REF_BASE, id), path.join(REF_ALT, id)]) if (fs.existsSync(p)) return p;
    return null;
}
function fragSourceFor(id: string): string | null {
    if (DEC_MAP[id]) return DEC_MAP[id];
    const p = resolveFrag(id); return p ? fs.readFileSync(p, 'utf8') : null;
}

// Compute per-channel std-dev of a PNG by drawing it on a canvas in-page.
async function pngStdDev(page: any, pngPath: string): Promise<[number, number, number]> {
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(pngPath).toString('base64');
    return await page.evaluate(async (durl: string) => {
        const img = new Image(); img.src = durl;
        await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        const n = c.width * c.height;
        let sr = 0, sg = 0, sb = 0;
        for (let i = 0; i < n; i++) { sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; }
        const mr = sr / n, mg = sg / n, mb = sb / n;
        let vr = 0, vg = 0, vb = 0;
        for (let i = 0; i < n; i++) { vr += (d[i * 4] - mr) ** 2; vg += (d[i * 4 + 1] - mg) ** 2; vb += (d[i * 4 + 2] - mb) ** 2; }
        return [Math.sqrt(vr / n), Math.sqrt(vg / n), Math.sqrt(vb / n)];
    }, dataUrl);
}

async function main() {
    fs.mkdirSync(SC_DIR, { recursive: true });
    const pngs = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && !f.startsWith('_sheet'));
    console.log(`scanning ${pngs.length} PNGs for single-colour (threshold mean-stddev < ${THRESH})`);

    const browser = await chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
    });
    const detectPage = await browser.newContext({ viewport: { width: 400, height: 400 } }).then(c => c.newPage());
    await detectPage.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await detectPage.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });

    const flagged: string[] = [];  // catalog ids
    for (const f of pngs) {
        const sd = await pngStdDev(detectPage, path.join(DIR, f));
        const mean = (sd[0] + sd[1] + sd[2]) / 3;
        if (mean < THRESH) {
            const id = NAME_TO_ID[f.replace(/\.png$/, '')];
            if (id) { flagged.push(id); fs.copyFileSync(path.join(DIR, f), path.join(SC_DIR, f.replace(/\.png$/, '.orig.png'))); }
        }
    }
    await detectPage.context().close();
    fs.writeFileSync(path.join(SC_DIR, '_flagged.json'), JSON.stringify(flagged, null, 1));
    console.log(`flagged ${flagged.length} single-colour renders -> ${SC_DIR} (originals saved as *.orig.png)`);
    if (DETECT_ONLY) { await browser.close(); return; }

    // Phase B: retry with headlight across z-offsets.
    function headlightOverride() {
        return {
            materials: { diffuse: 1.2, specular: 0.8, roughness: 0.55 },
            lighting: { shadows: false, lights: [
                // FIXED light => camera-relative (a true headlight just ahead of the camera)
                { type: 'Point', position: { x: 0.0, y: 0.0, z: 0.6 }, rotation: { x: 0, y: 0, z: 0 },
                  color: '#fff0e0', intensity: 6.0, falloff: 0, range: 0, falloffType: 'Quadratic',
                  fixed: true, visible: true, castShadow: false },
                { type: 'Directional', position: { x: 0.6, y: 0.8, z: 0.5 }, rotation: { x: 0, y: 0, z: 0 },
                  color: '#bcd0ff', intensity: 0.4, falloff: 0, falloffType: 'Quadratic',
                  fixed: true, visible: true, castShadow: false },
            ] },
            atmosphere: { glowIntensity: 0.006, glowColor: '#ffd9b0' },
        };
    }

    async function retryOne(browser: Browser, id: string) {
        const page = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 60 } }).then(c => c.newPage());
        const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
        try {
            await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });
            const src = fragSourceFor(id);
            if (!src) return { id, ok: false, error: 'no source' };
            const pipeline = catalog.byId[id]?.recommended ?? 'v3';
            let best: { png: string; mean: number; dist: number } | null = null;
            for (let k = 0; k < DISTS.length; k++) {
                const d = DISTS[k];
                const spec: any = {
                    id, formula: 'retry_' + safeName(id).replace(/\./g, '_') + '_' + d,  // unique id per dist
                    fragSource: src, pipeline, mode: 'single', size: [SIZE, SIZE], timeoutMs: 45000,
                    cameraOverrides: orbitCamera(d, 35, 20),
                    configOverrides: headlightOverride(),
                };
                const r: any = await page.evaluate((s) => (window as any).runFragRenderTest(s), spec);
                if (r.ok && r.thumbnailPNG && r.render?.sigma) {
                    const mean = (r.render.sigma[0] + r.render.sigma[1] + r.render.sigma[2]) / 3;
                    if (!best || mean > best.mean) best = { png: r.thumbnailPNG, mean, dist: d };
                }
            }
            if (best) {
                fs.writeFileSync(path.join(SC_DIR, safeName(id) + '.png'),
                    Buffer.from(best.png.replace(/^data:image\/png;base64,/, ''), 'base64'));
                return { id, ok: true, bestDist: best.dist, mean: +best.mean.toFixed(2) };
            }
            return { id, ok: false, error: (errs[0] ?? 'all dists empty').slice(0, 120) };
        } finally { await page.context().close(); }
    }

    let idx = 0, fixed = 0, still = 0;
    const results: any[] = [];
    async function worker() {
        while (idx < flagged.length) {
            const id = flagged[idx++];
            const r = await retryOne(browser, id);
            results.push(r);
            const recovered = r.ok && r.mean >= THRESH;
            if (recovered) fixed++; else still++;
            console.log(`[${results.length}/${flagged.length}] ${recovered ? 'RECOVERED' : (r.ok ? 'still-flat' : 'FAIL')} ${id}${r.ok ? `  bestDist=${r.bestDist} mean=${r.mean}` : '  ' + r.error}`);
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONC, flagged.length) }, () => worker()));
    fs.writeFileSync(path.join(SC_DIR, '_retry_status.json'), JSON.stringify(results, null, 1));
    await browser.close();
    console.log(`\nRETRY DONE  recovered=${fixed}  still-flat=${still}  (in ${SC_DIR})`);
}
main().catch(e => { console.error(e); process.exit(1); });
