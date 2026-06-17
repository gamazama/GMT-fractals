/**
 * frag-autolevels.mts — apply an auto-levels filter to every thumbnail in a
 * folder and save the results to a new folder.
 *
 * Pure 2D-canvas image processing in a headless browser (no WebGL), so it is
 * safe to run alongside the engine render batches.
 *
 * Auto-levels: per channel, find the low/high intensity at the given percentile
 * cutoffs (ignores a few outlier pixels), then linearly stretch that range to
 * [0,255]. Black backgrounds are excluded from the stats so the fractal itself
 * drives the stretch rather than the empty surround.
 *
 * Modes:
 *   --mode=channel  (default) per-channel stretch  — Photoshop "Auto Levels",
 *                   maximises contrast, may shift colour balance.
 *   --mode=lum      stretch on luminance only, applied equally to R/G/B —
 *                   preserves hue, just brightens/contrasts.
 *
 * Usage:
 *   npx tsx debug/frag-autolevels.mts                       # debug/scratch/frag-gallery -> -levels
 *   npx tsx debug/frag-autolevels.mts --src=DIR --out=DIR --lowp=0.4 --highp=99.6 --gamma=0.85
 *   npx tsx debug/frag-autolevels.mts --mode=lum --gamma=0.9
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const SRC    = arg('--src', 'debug/scratch/frag-gallery')!;
const OUT    = arg('--out', SRC.replace(/[\\/]+$/, '') + '-levels')!;
const LOWP   = parseFloat(arg('--lowp', '0.5')!);    // low percentile cutoff
const HIGHP  = parseFloat(arg('--highp', '99.5')!);  // high percentile cutoff
const GAMMA  = parseFloat(arg('--gamma', '1.0')!);   // <1 brightens midtones
const MODE   = arg('--mode', 'channel')!;            // 'channel' | 'lum'
const BLACK  = parseInt(arg('--blackcut', '6')!, 10); // pixels with max(r,g,b) <= this excluded from stats (background)
const RECURSE = process.argv.includes('--recurse');

function listPngs(dir: string): string[] {
    const out: string[] = [];
    const walk = (d: string, rel: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (e.name.startsWith('_sheet')) continue;
            const full = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
            if (e.isDirectory()) { if (RECURSE) walk(full, r); }
            else if (e.name.toLowerCase().endsWith('.png')) out.push(r);
        }
    };
    walk(dir, '');
    return out;
}

async function main() {
    if (!fs.existsSync(SRC)) { console.error('src not found: ' + SRC); process.exit(1); }
    fs.mkdirSync(OUT, { recursive: true });
    const files = listPngs(SRC);
    console.log(`auto-levels: ${files.length} PNGs  ${SRC} -> ${OUT}  mode=${MODE} clip=[${LOWP},${HIGHP}]% gamma=${GAMMA}`);
    if (!files.length) { console.log('nothing to do'); return; }

    const browser = await chromium.launch();  // no GL flags — 2D canvas only
    const ctx0 = await browser.newContext({ viewport: { width: 600, height: 600 } });
    // esbuild/tsx wraps named functions with __name(); ensure it exists in-page before any evaluate.
    await ctx0.addInitScript(() => { (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn); });
    const page = await ctx0.newPage();
    await page.goto('about:blank');

    let done = 0, skipped = 0;
    for (const rel of files) {
        const srcPath = path.join(SRC, rel);
        const dataUrl = 'data:image/png;base64,' + fs.readFileSync(srcPath).toString('base64');
        const result: string | null = await page.evaluate(async ({ durl, LOWP, HIGHP, GAMMA, MODE, BLACK }) => {
            const img = new Image(); img.src = durl;
            await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
            if (!img.width) return null;
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, c.width, c.height);
            const d = imgData.data, n = c.width * c.height;

            // Build histograms over non-background pixels.
            const hist = [new Array(256).fill(0), new Array(256).fill(0), new Array(256).fill(0)];
            const lumHist = new Array(256).fill(0);
            let counted = 0;
            for (let i = 0; i < n; i++) {
                const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
                if (Math.max(r, g, b) <= BLACK) continue;  // skip background
                hist[0][r]++; hist[1][g]++; hist[2][b]++;
                const L = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
                lumHist[L]++; counted++;
            }
            if (counted < 16) return 'EMPTY';  // basically nothing but background — leave it

            const cut = (h: number[], total: number, pct: number) => {
                const target = total * pct / 100; let acc = 0;
                for (let v = 0; v < 256; v++) { acc += h[v]; if (acc >= target) return v; }
                return 255;
            };
            const lut = (lo: number, hi: number) => {
                const span = Math.max(1, hi - lo);
                const t = new Uint8Array(256);
                for (let v = 0; v < 256; v++) {
                    let x = (v - lo) / span; x = x < 0 ? 0 : x > 1 ? 1 : x;
                    if (GAMMA !== 1.0) x = Math.pow(x, GAMMA);
                    t[v] = Math.round(x * 255);
                }
                return t;
            };

            if (MODE === 'lum') {
                const lo = cut(lumHist, counted, LOWP), hi = cut(lumHist, counted, HIGHP);
                const span = Math.max(1, hi - lo);
                for (let i = 0; i < n; i++) {
                    for (let ch = 0; ch < 3; ch++) {
                        const v = d[i * 4 + ch];
                        let x = (v - lo) / span; x = x < 0 ? 0 : x > 1 ? 1 : x;
                        if (GAMMA !== 1.0) x = Math.pow(x, GAMMA);
                        d[i * 4 + ch] = Math.round(x * 255);
                    }
                }
            } else {
                const luts = [0, 1, 2].map(ch => lut(cut(hist[ch], counted, LOWP), cut(hist[ch], counted, HIGHP)));
                for (let i = 0; i < n; i++) {
                    d[i * 4]     = luts[0][d[i * 4]];
                    d[i * 4 + 1] = luts[1][d[i * 4 + 1]];
                    d[i * 4 + 2] = luts[2][d[i * 4 + 2]];
                }
            }
            ctx.putImageData(imgData, 0, 0);
            return c.toDataURL('image/png');
        }, { durl: dataUrl, LOWP, HIGHP, GAMMA, MODE, BLACK });

        const outPath = path.join(OUT, rel);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        if (result && result !== 'EMPTY') {
            fs.writeFileSync(outPath, Buffer.from(result.replace(/^data:image\/png;base64,/, ''), 'base64'));
            done++;
        } else {
            // copy through unchanged (empty/black) so the output folder is complete
            fs.copyFileSync(srcPath, outPath);
            skipped++;
        }
        if ((done + skipped) % 25 === 0) console.log(`  ${done + skipped}/${files.length} (${skipped} passed through)`);
    }
    await browser.close();
    console.log(`DONE  leveled=${done}  passed-through=${skipped}  -> ${OUT}`);
}
main().catch(e => { console.error(e); process.exit(1); });
