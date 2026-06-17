/**
 * frag-gallery.mts — render frag-workshop formulas to PNGs via the real engine.
 *
 * Reads public/formulas/v3-v4-catalog.json, resolves each formula's .frag under
 * the reference Examples dir, and renders it through render-harness.ts's
 * window.runFragRenderTest using the catalog's recommended pipeline (v3/v4).
 * Each formula renders in a FRESH page (the engine compile path isn't re-entrant
 * across many switches). Writes one PNG per formula + a JSONL status log.
 *
 * Requires dev server: npx vite --port 5173
 * Usage:
 *   npx tsx debug/frag-gallery.mts --limit=8                 # first 8 renderable
 *   npx tsx debug/frag-gallery.mts --ids=a,b,c               # specific ids
 *   npx tsx debug/frag-gallery.mts --all --size=256 --concurrency=3
 *   npx tsx debug/frag-gallery.mts --offset=100 --limit=100  # batch slice
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser } from 'playwright';
import { orbitCamera } from './opus-cam';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const PORT        = arg('--port', '5173')!;
const SIZE        = parseInt(arg('--size', '320')!, 10);
const LIMIT       = arg('--limit') ? parseInt(arg('--limit')!, 10) : Infinity;
const OFFSET      = parseInt(arg('--offset', '0')!, 10);
const ALL         = process.argv.includes('--all');
const IDS         = arg('--ids');
const CONCURRENCY = parseInt(arg('--concurrency', '3')!, 10);
const OUT_DIR     = arg('--outdir', 'debug/scratch/frag-gallery')!;
const ORBIT       = arg('--orbit');   // "dist,az,el" — frame via orbit camera (for preset-less DEC formulas)
const BRIGHTEN    = process.argv.includes('--brighten');  // boost lights/material for preset-less formulas
const URL         = `http://localhost:${PORT}/render-harness.html`;

const ROOT       = 'h:/GMT/workspace-gmt/dev';
const CATALOG    = path.join(ROOT, 'public/formulas/v3-v4-catalog.json');
const REF_BASE   = path.join(ROOT, 'engine-gmt/features/fragmentarium_import/reference/Examples');
const REF_ALT    = path.join(ROOT, 'engine-gmt/features/fragmentarium_import/reference');
const DEC_JSON   = path.join(ROOT, 'public/formulas/dec.json');

function safeName(id: string) { return id.replace(/[^a-zA-Z0-9_.-]/g, '_'); }

// DEC-embedded formulas: id -> raw GLSL code (from public/formulas/dec.json).
const DEC_MAP: Record<string, string> = (() => {
    try {
        const arr = JSON.parse(fs.readFileSync(DEC_JSON, 'utf8'));
        const m: Record<string, string> = {};
        for (const e of arr) if (e && e.id && e.code) m[e.id] = e.code;
        return m;
    } catch { return {}; }
})();

function resolveFrag(id: string): string | null {
    // catalog id is like "3DickUlus/3Dickulus.frag" relative to Examples; try a few bases.
    const tries = [path.join(REF_BASE, id), path.join(REF_ALT, id), path.join(ROOT, 'engine-gmt/features/fragmentarium_import/reference', id)];
    for (const p of tries) if (fs.existsSync(p)) return p;
    // fallback: basename search under Examples
    const base = path.basename(id);
    const found = walkFind(REF_BASE, base);
    return found;
}
function walkFind(dir: string, name: string): string | null {
    let stack = [dir];
    while (stack.length) {
        const d = stack.pop()!;
        let entries: fs.Dirent[] = [];
        try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) stack.push(full);
            else if (e.name === name) return full;
        }
    }
    return null;
}

interface Job { id: string; pipeline: 'v3' | 'v4'; fragPath?: string; fragSource?: string; }

async function renderJob(browser: Browser, job: Job): Promise<any> {
    const page = await browser.newContext({ viewport: { width: SIZE + 40, height: SIZE + 60 } }).then(c => c.newPage());
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });
        const fragSource = job.fragSource ?? fs.readFileSync(job.fragPath!, 'utf8');
        const spec: any = {
            id: job.id, formula: 'frag_' + safeName(job.id).replace(/\./g, '_'),
            fragSource, pipeline: job.pipeline,
            mode: 'single', size: [SIZE, SIZE], timeoutMs: 45000,
        };
        if (ORBIT) {
            const [d, a, e] = ORBIT.split(',').map(Number);
            spec.cameraOverrides = orbitCamera(d, a, e);
        }
        if (BRIGHTEN) {
            spec.configOverrides = {
                materials: { diffuse: 1.2, specular: 1.0, roughness: 0.5 },
                atmosphere: { glowIntensity: 0.01, glowColor: '#ffd9b0' },
            };
        }
        const r: any = await page.evaluate((s) => (window as any).runFragRenderTest(s), spec);
        if (r.ok && r.thumbnailPNG) {
            const out = path.join(OUT_DIR, safeName(job.id) + '.png');
            fs.writeFileSync(out, Buffer.from(String(r.thumbnailPNG).replace(/^data:image\/png;base64,/, ''), 'base64'));
            return { id: job.id, pipeline: job.pipeline, ok: true, out, nonBlack: r.render?.nonBlackFraction, sigma: r.render?.sigma };
        }
        return { id: job.id, pipeline: job.pipeline, ok: false, error: (r.error ?? errors[0] ?? 'unknown').slice(0, 200) };
    } catch (e: any) {
        return { id: job.id, pipeline: job.pipeline, ok: false, error: `driver: ${(e?.message ?? String(e)).slice(0, 160)}` };
    } finally {
        await page.context().close();
    }
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
    const SOURCE = arg('--source');  // 'dec' = only DEC-embedded ids; 'file' = only file-backed
    let ids = Object.keys(catalog.byId);
    if (IDS) { const want = new Set(IDS.split(',')); ids = ids.filter(i => want.has(i)); }
    else {
        ids = ids.filter(i => catalog.byId[i].recommended !== 'none'); // skip unrenderable
        if (SOURCE === 'dec')  ids = ids.filter(i => !!DEC_MAP[i]);
        if (SOURCE === 'file') ids = ids.filter(i => !DEC_MAP[i]);
        ids = ids.slice(OFFSET, ALL ? undefined : OFFSET + (LIMIT === Infinity ? 8 : LIMIT));
    }

    const jobs: Job[] = [];
    const unresolved: string[] = [];
    for (const id of ids) {
        const pipeline = catalog.byId[id].recommended;
        if (DEC_MAP[id]) { jobs.push({ id, pipeline, fragSource: DEC_MAP[id] }); continue; }
        const fragPath = resolveFrag(id);
        if (!fragPath) { unresolved.push(id); continue; }
        jobs.push({ id, pipeline, fragPath });
    }
    console.log(`jobs=${jobs.length}  unresolved=${unresolved.length}  size=${SIZE}  conc=${CONCURRENCY}`);
    if (unresolved.length) console.log('  unresolved sample: ' + unresolved.slice(0, 5).join(' | '));

    const browser = await chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--ignore-gpu-blocklist', '--enable-webgl'],
    });

    const statusPath = path.join(OUT_DIR, '_status.jsonl');
    fs.writeFileSync(statusPath, '');
    const results: any[] = [];
    let idx = 0, ok = 0, blank = 0, fail = 0;
    async function worker(wid: number) {
        while (idx < jobs.length) {
            const job = jobs[idx++];
            const r = await renderJob(browser, job);
            // treat near-empty frames as blank
            if (r.ok && (r.nonBlack === 0 || (r.sigma && r.sigma[0] === 0 && r.sigma[1] === 0 && r.sigma[2] === 0))) { r.blank = true; }
            results.push(r);
            fs.appendFileSync(statusPath, JSON.stringify(r) + '\n');
            if (r.ok && !r.blank) ok++; else if (r.blank) blank++; else fail++;
            const tag = r.ok ? (r.blank ? 'BLANK' : 'ok ') : 'FAIL';
            console.log(`[${results.length}/${jobs.length}] ${tag} ${job.id} (${job.pipeline})${r.ok ? '' : '  ' + r.error}`);
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, (_, i) => worker(i)));
    await browser.close();
    console.log(`\nDONE  ok=${ok}  blank=${blank}  fail=${fail}  (PNGs in ${OUT_DIR}, status ${statusPath})`);
}
main().catch(e => { console.error(e); process.exit(1); });
