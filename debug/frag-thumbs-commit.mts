/**
 * frag-thumbs-commit.mts — build the COMMITTED frag/DEC thumbnail subset.
 *
 * Takes the auto-leveled 288px PNGs in debug/scratch/frag-gallery-levels/,
 * selects the curated buckets from the triage report (default: works +
 * needsLight = 438), downsizes each to a small square JPEG, and writes them to
 * public/thumbnails/frag/<safeId>.jpg — mirroring the native
 * public/thumbnails/fractal_<Name>.jpg convention so the picker/Workshop UI can
 * resolve a thumbnail straight from a catalog id.
 *
 *   safeId  = id.replace(/[^a-zA-Z0-9_.-]/g, '_')      (matches the render set)
 *   src PNG = <levels>/<safeId>.png
 *   out JPG = public/thumbnails/frag/<safeId>.jpg
 *
 * Pure 2D-canvas in headless chromium (no WebGL, no dev server). Same approach
 * as frag-autolevels.mts.
 *
 * Usage (from dev/):
 *   npx tsx debug/frag-thumbs-commit.mts                       # 438 @ 128px q0.85
 *   npx tsx debug/frag-thumbs-commit.mts --size=128 --quality=0.85
 *   npx tsx debug/frag-thumbs-commit.mts --buckets=works,needsLight,flat
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
// Single source of truth for the safeId transform — shared with the picker
// (engine-gmt/components/FormulaPicker/catalogGroups.ts) so the committed
// filename always matches the URL the UI computes from a catalog id.
import { fragThumbSafeId as safeId } from '../engine-gmt/components/FormulaPicker/catalogGroups';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const LEVELS  = arg('--src', 'debug/scratch/frag-gallery-levels')!;
const OUT     = arg('--out', 'public/thumbnails/frag')!;
const REPORT  = arg('--report', 'debug/scratch/frag-gallery/_report/report.json')!;
const SIZE    = parseInt(arg('--size', '128')!, 10);
const QUALITY = parseFloat(arg('--quality', '0.85')!);
const BUCKETS = arg('--buckets', 'works,needsLight')!.split(',').map(s => s.trim()).filter(Boolean);

function idsFromReport(): string[] {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    const ids: string[] = [];
    for (const b of BUCKETS) {
        const arr = report[b];
        if (!Array.isArray(arr)) { console.warn(`report has no bucket "${b}"`); continue; }
        for (const e of arr) ids.push(typeof e === 'string' ? e : e.id);
    }
    return ids;
}

async function main() {
    if (!fs.existsSync(LEVELS)) { console.error('levels dir not found: ' + LEVELS); process.exit(1); }
    if (!fs.existsSync(REPORT)) { console.error('report not found: ' + REPORT); process.exit(1); }
    fs.mkdirSync(OUT, { recursive: true });

    const ids = idsFromReport();
    console.log(`commit thumbs: ${ids.length} ids from [${BUCKETS.join(', ')}]  ${SIZE}px q${QUALITY}  -> ${OUT}`);

    const browser = await chromium.launch();
    const ctx0 = await browser.newContext({ viewport: { width: 400, height: 400 } });
    await ctx0.addInitScript(() => { (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn); });
    const page = await ctx0.newPage();
    await page.goto('about:blank');

    let done = 0; const missing: string[] = []; let bytes = 0;
    const written: string[] = [];
    for (const id of ids) {
        const safe = safeId(id);
        const srcPath = path.join(LEVELS, safe + '.png');
        if (!fs.existsSync(srcPath)) { missing.push(id); continue; }
        const dataUrl = 'data:image/png;base64,' + fs.readFileSync(srcPath).toString('base64');
        const result: string | null = await page.evaluate(async ({ durl, SIZE, QUALITY }) => {
            const img = new Image(); img.src = durl;
            await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
            if (!img.width) return null;
            // contain into a SIZE×SIZE box, preserving aspect (renders are square anyway)
            const scale = SIZE / Math.max(img.width, img.height);
            const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const ctx = c.getContext('2d')!;
            ctx.imageSmoothingEnabled = true;
            (ctx as any).imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            return c.toDataURL('image/jpeg', QUALITY);
        }, { durl: dataUrl, SIZE, QUALITY });
        if (!result) { missing.push(id); continue; }
        const buf = Buffer.from(result.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
        fs.writeFileSync(path.join(OUT, safe + '.jpg'), buf);
        bytes += buf.length; done++; written.push(id);
        if (done % 50 === 0) console.log(`  ${done}/${ids.length}`);
    }
    await browser.close();

    // Index of catalog ids that got a committed thumbnail. The picker's
    // useCatalogGroups() fetches this to show ONLY thumbnailed entries — the
    // 438 works+needsLight set is not derivable from the v3-v4 compat catalog
    // (which only knows pipeline pass/fail, not render quality).
    written.sort((a, b) => a.localeCompare(b));
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(written, null, 0));
    console.log(`DONE  wrote=${done}  missing=${missing.length}  total=${(bytes / 1024 / 1024).toFixed(2)} MB  -> ${OUT}`);
    console.log(`index.json: ${written.length} ids`);
    if (missing.length) {
        console.log('MISSING (no leveled PNG on disk):');
        for (const m of missing) console.log('  ' + m);
    }
}
main().catch(e => { console.error(e); process.exit(1); });
