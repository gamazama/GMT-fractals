/**
 * Render Harness Sweep — Playwright-driven driver.
 *
 * Spawns Chromium, navigates to http://localhost:3000/render-harness.html
 * (served by the app's dev server), iterates test cases, calls
 * `window.runRenderTest(spec)` on each.
 *
 * Prereq: `npm run dev` must be running in another terminal (port 3000).
 * The script checks reachability and fails fast with a clear message.
 *
 * Usage:
 *   npx tsx debug/render-sweep.mts                       # Phase 1
 *   npx tsx debug/render-sweep.mts --phase=2             # Feature axes
 *   npx tsx debug/render-sweep.mts --phase=3             # Perf subset
 *   npx tsx debug/render-sweep.mts --formula=Mandelbulb  # Single-formula subset
 *   npx tsx debug/render-sweep.mts --fresh               # Wipe jsonl
 *   npx tsx debug/render-sweep.mts --show                # Non-headless
 *   npx tsx debug/render-sweep.mts --verbose             # Per-case detail
 *   npx tsx debug/render-sweep.mts --swiftshader         # Force SwiftShader for reproducibility (CI)
 *   npx tsx debug/render-sweep.mts --timeout=60000       # Per-case timeout
 *   npx tsx debug/render-sweep.mts --formula=X --gallery # Write a 256x256 JPG to
 *                                                        # public/thumbnails/fractal_X.jpg
 *                                                        # (matches in-app gallery convention)
 *
 * Output:
 *   debug/render-sweep-phase<N>.jsonl                    one row per case
 *   debug/thumbnails/render/<case_id>.png                e.g. Mandelbulb__baseline.png
 *   public/thumbnails/fractal_<formula>.jpg              only when --gallery is set
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { chromium, Browser, Page } from 'playwright';

import { phase1Cases, phase2Cases, phase3Cases, type HarnessCase } from './render-cases.ts';

const VERBOSE     = process.argv.includes('--verbose');
const FRESH       = process.argv.includes('--fresh');
const HEADLESS    = !process.argv.includes('--show');
const SWIFTSHADER = process.argv.includes('--swiftshader');
const GALLERY     = process.argv.includes('--gallery');
const PHASE       = argVal('--phase') ?? '1';
const FORMULA     = argVal('--formula');
const TIMEOUT_MS  = parseInt(argVal('--timeout') ?? '45000', 10);
const PORT        = parseInt(argVal('--port') ?? '3000', 10);
// Gallery thumbnails match the in-app FormulaGallery convention: 256×256 JPEG,
// named fractal_<formula>.jpg, served from /thumbnails/ (public/thumbnails/).
const GALLERY_SIZE: [number, number] = [256, 256];
const GALLERY_QUALITY = 0.92;
const GALLERY_DIR = path.resolve('public/thumbnails');

function argVal(flag: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit?.split('=')[1];
}

const OUT_JSONL  = path.resolve(`debug/render-sweep-phase${PHASE}.jsonl`);
const OUT_THUMBS = path.resolve('debug/thumbnails/render');
const HARNESS_URL = `http://localhost:${PORT}/render-harness.html`;

// ─── Dev server reachability check ───────────────────────────────────────────

async function checkDevServer(): Promise<boolean> {
    return new Promise(resolve => {
        const req = http.get(HARNESS_URL, { timeout: 3000 }, res => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

// ─── Case selection ──────────────────────────────────────────────────────────

function getCases(): HarnessCase[] {
    let all: HarnessCase[];
    switch (PHASE) {
        case '1': all = phase1Cases(); break;
        case '2': all = phase2Cases(); break;
        case '3': all = phase3Cases(); break;
        default:
            console.error(`invalid --phase=${PHASE}. use 1, 2, or 3`);
            process.exit(1);
    }
    if (FORMULA) all = all.filter(c => c.formula === FORMULA);
    return all;
}

// ─── Browser lifecycle ───────────────────────────────────────────────────────

async function launch(): Promise<Browser> {
    const args: string[] = ['--ignore-gpu-blocklist', '--enable-webgl'];
    if (SWIFTSHADER) {
        args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
    }
    return await chromium.launch({ headless: HEADLESS, args, timeout: 30_000 });
}

async function openPage(browser: Browser): Promise<Page> {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log(`  [browser error] ${e.message}`));
    if (VERBOSE) {
        page.on('console', m => {
            if (m.type() !== 'debug') console.log(`  [browser ${m.type()}] ${m.text()}`);
        });
    }
    await page.goto(HARNESS_URL, { timeout: 20_000 });
    await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 30_000 });
    return page;
}

class TimeoutError extends Error { constructor(public ms: number) { super(`timeout ${ms}ms`); } }

function withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
    let t: NodeJS.Timeout | null = null;
    const timeout = new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new TimeoutError(ms)), ms);
    });
    return Promise.race([p, timeout]).finally(() => { if (t) clearTimeout(t); }) as Promise<T>;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    if (!(await checkDevServer())) {
        console.error(`\n  ✗ Dev server not reachable at ${HARNESS_URL}`);
        console.error(`  Start it in another terminal:  npm run dev\n`);
        process.exit(1);
    }

    if (!fs.existsSync(OUT_THUMBS)) fs.mkdirSync(OUT_THUMBS, { recursive: true });
    if (GALLERY && !fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

    let cases = getCases();

    // Resume-skip
    const done = new Set<string>();
    if (!FRESH && fs.existsSync(OUT_JSONL)) {
        for (const line of fs.readFileSync(OUT_JSONL, 'utf8').trim().split('\n').filter(Boolean)) {
            try { done.add(JSON.parse(line).id); } catch {}
        }
        const before = cases.length;
        cases = cases.filter(c => !done.has(c.id));
        if (before > cases.length) console.log(`  --resume: skipping ${before - cases.length} already-tested cases`);
    } else {
        fs.writeFileSync(OUT_JSONL, '');
    }

    if (cases.length === 0) {
        console.log('  Nothing to do (use --fresh to re-run)');
        process.exit(0);
    }

    const renderer = SWIFTSHADER ? 'SwiftShader (software)' : 'local GPU';
    console.log(`\n  Render Harness Sweep — phase ${PHASE}, renderer: ${renderer}`);
    console.log(`  ${cases.length} cases to test  (timeout ${TIMEOUT_MS}ms each)`);
    console.log(`  Output: ${OUT_JSONL}\n`);

    const browser = await launch();
    const page = await openPage(browser);

    let pass = 0, fail = 0;
    const start = performance.now();
    const failReasons: Record<string, number> = {};

    let aborted = false;
    process.on('SIGINT', () => { aborted = true; console.log('\n  [SIGINT] finishing current case…'); });

    for (let i = 0; i < cases.length; i++) {
        if (aborted) break;
        const c = cases[i];

        // In gallery mode, inject JPEG format + 256×256 size so the harness
        // produces files that drop straight into public/thumbnails/.
        const spec = GALLERY
            ? { ...c, imageFormat: 'jpeg', imageQuality: GALLERY_QUALITY, size: GALLERY_SIZE }
            : c;

        let result: any;
        try {
            result = await withTimeout(
                page.evaluate(async (s) => await (window as any).runRenderTest(s), spec as any),
                TIMEOUT_MS,
                c.id,
            );
        } catch (e: any) {
            result = {
                id: c.id, ok: false,
                error: e instanceof TimeoutError ? 'driver timeout' : (e?.message ?? String(e)),
                compile: { totalMs: 0 },
                render: { sigma: [0, 0, 0], nanFraction: 0, nonBlackFraction: 0 },
                timeMs: TIMEOUT_MS,
            };
        }

        // Persist thumbnail separately (keeps the jsonl small). Use the case
        // ID as the filename so you can find a specific formula's thumbnail
        // directly (`Mandelbulb__baseline.png` rather than a sha1 hash).
        if (result.thumbnailPNG) {
            const isJpeg = result.thumbnailPNG.startsWith('data:image/jpeg');
            const b64 = result.thumbnailPNG.replace(/^data:image\/(png|jpeg);base64,/, '');
            const buf = Buffer.from(b64, 'base64');

            if (GALLERY) {
                // One JPEG per formula, matching FormulaGallery's naming.
                const jpgPath = path.join(GALLERY_DIR, `fractal_${c.formula}.jpg`);
                fs.writeFileSync(jpgPath, buf);
                result.thumbnail = `thumbnails/fractal_${c.formula}.jpg`;
            } else {
                const safeName = c.id.replace(/[^\w=.-]/g, '_');
                const ext = isJpeg ? 'jpg' : 'png';
                const outPath = path.join(OUT_THUMBS, `${safeName}.${ext}`);
                fs.writeFileSync(outPath, buf);
                result.thumbnail = `thumbnails/render/${safeName}.${ext}`;
            }
            delete result.thumbnailPNG;
        }
        // Merge source case data into result for analysis (formula, axis, etc.)
        const row = { ...c, ...result };
        fs.appendFileSync(OUT_JSONL, JSON.stringify(row) + '\n');

        if (result.ok) pass++;
        else {
            fail++;
            const key = result.error?.split('\n')[0].slice(0, 50) ?? 'unknown';
            failReasons[key] = (failReasons[key] || 0) + 1;
        }

        const icon = result.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const perfStr = result.frames
            ? `  ${result.frames.samplesPerSec}spl/s p50=${result.frames.frameMsP50}ms`
            : '';
        const compileStr = `cc=${result.compile?.totalMs ?? 0}ms`;
        process.stdout.write(
            `  ${icon} [${(i+1).toString().padStart(4)}/${cases.length}] ${c.id.padEnd(48)} ${compileStr}${perfStr} ${(result.timeMs+'ms').padStart(7)}\n`
        );
        if (VERBOSE && !result.ok) console.log(`      └── ${result.error?.slice(0, 160)}`);
    }

    await browser.close();

    const totalSec = ((performance.now() - start) / 1000).toFixed(1);
    console.log(`\n  ────────────────────────────────────────`);
    console.log(`  \x1b[32m${pass} pass\x1b[0m  \x1b[31m${fail} fail\x1b[0m  (${totalSec}s)`);
    if (fail > 0) {
        console.log(`\n  Failure reasons:`);
        for (const [k, v] of Object.entries(failReasons).sort((a, b) => b[1] - a[1])) {
            console.log(`    [${v}] ${k}`);
        }
    }
    console.log(`\n  Results: ${OUT_JSONL}\n`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
