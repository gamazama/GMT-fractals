/**
 * Smoke: a failed shader compile is SIGNALLED, in-app and on the proxy.
 *
 * Until 2026-09-02 a compile/link failure after boot had no in-app trace:
 * `hasCompiledShader` stayed true (it means "a compile was issued"), the
 * worker kept rendering empty frames, and the only signal was a
 * console.error. This smoke boots app-gmt, registers a copy of Mandelbulb
 * with a bare identifier injected into its loop body (a hard GLSL syntax
 * error), switches to it, and asserts:
 *
 *   [1] `window.__gmtProxy.lastCompileFailed` names the injected marker;
 *   [2] the CompilingIndicator shows its failed state
 *       (`[data-compile-failed]`) with the error text;
 *   [3] switching back to Mandelbulb clears both — the flag is null again
 *       and the failed pill is gone — and the app is still rendering
 *       (frameCount advances, no pageerrors).
 *
 * The expected `[WorkerProxy] Worker error:` console.error is NOT a failure
 * here; pageerrors are.
 *
 * Run: `npm run smoke:compile-failed` (needs the Vite dev server on :3400).
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   With the store's COMPILE_FAILED subscription removed: [2] red twice
 *   ("indicator did not show the failure (pill: null)", "the pill does not
 *   carry the GLSL error line"), [1] still green. With the proxy's
 *   `_lastCompileFailed` assignment removed: [1] red ("did not name the
 *   marker: null"), [2] still green. The two signals are independent by
 *   design, and each break was applied and restored on its own.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';
const MARKER = 'SMOKE_COMPILE_BREAK_MARKER';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process'],
});
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await context.newPage();
const pageErrors: string[] = [];
const logs: string[] = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

type Probe = { booted: boolean; compiled: boolean; failed: string | null; frames: number; pill: string | null; formula: string };
const probe = (): Promise<Probe> => page.evaluate(() => {
    const w = window as any;
    const proxy = w.__gmtProxy;
    const pill = document.querySelector('[data-compile-failed]');
    return {
        booted: !!proxy?.isBooted,
        compiled: !!proxy?.hasCompiledShader,
        failed: proxy?.lastCompileFailed ?? null,
        frames: proxy?.frameCount ?? 0,
        pill: pill ? (pill.textContent ?? '') : null,
        formula: String(w.__store?.getState?.().formula ?? ''),
    };
});

console.log('Baseline — booted on Mandelbulb');
const p0 = await probe();
if (p0.booted && p0.compiled) ok('booted with a compiled shader');
else fail(`not booted/compiled: ${JSON.stringify(p0)}`);
if (p0.failed === null) ok('proxy.lastCompileFailed is null at baseline');
else fail(`proxy.lastCompileFailed already set at baseline: ${p0.failed}`);
if (p0.pill === null) ok('no failed pill at baseline');
else fail(`failed pill present at baseline: ${p0.pill}`);

console.log('\nBreak — register a Mandelbulb clone with a syntax error and switch to it');
await page.evaluate((marker) => {
    const w = window as any;
    const reg = w.__fractalRegistry;
    const base = reg.get('Mandelbulb');
    const broken = {
        ...base,
        id: 'SmokeBroken',
        name: 'Smoke Broken',
        shader: { ...base.shader, loopBody: `${base.shader.loopBody}\n    ${marker};\n` },
        // The default preset names its formula; left as 'Mandelbulb' it would
        // flip the store straight back before the broken shader ever compiled.
        defaultPreset: { ...(base.defaultPreset ?? {}), formula: 'SmokeBroken' },
    };
    reg.register(broken);
    w.__fractalEvents.emit(w.__fractalEventNames.REGISTER_FORMULA, { id: broken.id, shader: broken.shader });
    w.__store.getState().setFormula('SmokeBroken');
}, MARKER);
await page.waitForTimeout(8000);

const p1 = await probe();
console.log(`  store.formula after switch: ${p1.formula}`);
console.log('  --- console since break (last 12) ---');
logs.slice(-12).forEach((l) => console.log('   ', l.slice(0, 220)));
if (typeof p1.failed === 'string' && p1.failed.includes(MARKER)) ok('proxy.lastCompileFailed names the broken marker');
else fail(`proxy.lastCompileFailed did not name the marker: ${JSON.stringify(p1.failed)}`);
if (p1.pill !== null && p1.pill.includes('compile failed')) ok(`indicator shows the failure: "${p1.pill.slice(0, 90)}"`);
else fail(`indicator did not show the failure (pill: ${JSON.stringify(p1.pill)})`);
if (p1.pill !== null && p1.pill.includes(MARKER)) ok('the pill carries the GLSL error line');
else fail('the pill does not carry the GLSL error line');

console.log('\nRecover — back to Mandelbulb');
await page.evaluate(() => (window as any).__store.getState().setFormula('Mandelbulb'));
await page.waitForTimeout(8000);
const p2 = await probe();
if (p2.failed === null) ok('proxy.lastCompileFailed is null again after a good compile');
else fail(`proxy.lastCompileFailed still set after recovery: ${p2.failed}`);
if (p2.pill === null) ok('indicator cleared after a good compile');
else fail(`failed pill still present after recovery: ${p2.pill}`);
if (p2.frames > p1.frames) ok(`renderer still ticking (frames ${p1.frames} → ${p2.frames})`);
else fail(`renderer stalled after recovery (frames ${p1.frames} → ${p2.frames})`);
if (pageErrors.length === 0) ok('no pageerrors');
else fail(`pageerrors: ${pageErrors.join(' | ')}`);

await browser.close();
console.log(failures === 0 ? '\nPASS — a failed compile is signalled and clears' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
