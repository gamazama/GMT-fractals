/**
 * Boot smoke test for the engine-gmt port.
 *
 * Goal: navigate to app-gmt.html, wait for the worker to boot, and assert
 * the boot chain actually completed.
 *
 * Asserts (see the bottom of the file): a canvas exists; `__gmtProxy`
 * reports `isBooted` + `hasCompiledShader`; `frameCount > 0` (RENDER_TICK →
 * FRAME_READY round-trips); the store carries the DDFS feature slices and the
 * default Mandelbulb formula; no page errors; and no console errors.
 *
 * Read the console-error assertion's comment before trusting
 * `hasCompiledShader` to mean what it says — it does not. It is an optimistic
 * latch, and the console stream is the only place a failed GLSL compile shows
 * up on the main thread.
 *
 * NOT asserted: pixel content. The screenshot at `debug/engine-gmt-smoke.png`
 * is for human inspection only — headless SwiftShader output is not a
 * trustworthy visual baseline.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

const errors: string[] = [];
const logs: string[] = [];
// Attach BEFORE navigation so boot-time logs are captured.
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Wait for worker boot + compile + first frames.

// Give the worker extra time to compile the full Mandelbulb shader.
await page.waitForTimeout(8000);

const probe = await page.evaluate(`(function() {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    const proxy = window.__gmtProxy;
    function ancestry(el) {
        const chain = [];
        let n = el;
        while (n && n.tagName && n.tagName !== 'BODY') {
            const cs = getComputedStyle(n);
            chain.push({
                tag: n.tagName,
                cls: n.className ? String(n.className).slice(0, 40) : '',
                vis: cs.visibility,
                opacity: cs.opacity,
                display: cs.display,
                pos: cs.position,
                zIndex: cs.zIndex,
                rect: [n.getBoundingClientRect().x, n.getBoundingClientRect().y, n.getBoundingClientRect().width, n.getBoundingClientRect().height].map(function(x){ return Math.round(x); }).join(','),
            });
            n = n.parentElement;
        }
        return chain;
    }
    return {
        numCanvases: canvases.length,
        c0: ancestry(canvases[0]),
        c1: canvases.length > 1 ? ancestry(canvases[1]) : null,
        proxyShadow: proxy ? {
            isBooted: proxy.isBooted,
            hasCompiledShader: proxy.hasCompiledShader,
            accumulationCount: proxy.accumulationCount,
            // Worker-side _tickCount, mirrored on every FRAME_READY. > 0 is the
            // only probe value that proves RENDER_TICK → FRAME_READY round-trips
            // (isBooted/hasCompiledShader latch before the first frame).
            frameCount: proxy.frameCount,
        } : null,
        featureRegistry: (function() {
            const r = window.__featureRegistry;
            if (!r) return null;
            const all = r.getAll ? r.getAll() : [];
            return {
                count: all.length,
                ids: all.map(function(f){ return f.id; }),
            };
        })(),
        storeSnapshot: (function() {
            const s = window.__store && window.__store.getState();
            if (!s) return null;
            return {
                formula: s.formula,
                hasOptics: !!s.optics,
                hasLighting: !!s.lighting,
                hasGeometry: !!s.geometry,
                hasColoring: !!s.coloring,
                hasMaterials: !!s.materials,
                hasQuality: !!s.quality,
                opticsFov: s.optics && s.optics.camFov,
                lightingMode: s.lighting && s.lighting.renderMode,
                iterations: s.coreMath && s.coreMath.iterations,
                lightCount: s.lighting && s.lighting.lights ? s.lighting.lights.length : 'n/a',
                allKeys: Object.keys(s).filter(function(k){ return typeof s[k] === 'object' && s[k] !== null && !Array.isArray(s[k]); }).slice(0, 30),
            };
        })(),
    };
})()`);

console.log('probe:', JSON.stringify(probe, null, 2));
console.log('\n--- console (last 30) ---');
logs.slice(-30).forEach((l) => console.log(l));
console.log('\n--- errors (' + errors.length + ') ---');
errors.forEach((e) => console.log(e));

// Capture a screenshot so we can visually verify the Mandelbulb rendered.
await page.screenshot({ path: 'debug/engine-gmt-smoke.png', fullPage: false });
console.log('[smoke] screenshot written to debug/engine-gmt-smoke.png');

await browser.close();

// ── Assertions ────────────────────────────────────────────────────────────
// Until 2026-07-27 this smoke collected `probe` and printed it, then gated
// ONLY on pageerrors — so a worker that never booted, a shader that never
// compiled, or a FRAME_READY loop that never ran all exited 0 (none of those
// throw on the page). Each value the probe collects now feeds an assertion.
const failures: string[] = [];
const p = probe as any;
const shadow = p?.proxyShadow;
const store = p?.storeSnapshot;

if (!(p?.numCanvases >= 1)) failures.push(`expected >= 1 canvas, got ${p?.numCanvases}`);
if (!shadow) failures.push('window.__gmtProxy missing — renderer never installed');
else {
    if (shadow.isBooted !== true) failures.push('proxy.isBooted false — worker never sent BOOTED');
    if (shadow.hasCompiledShader !== true) failures.push('proxy.hasCompiledShader false — no shader compile completed');
    if (!(shadow.frameCount > 0)) failures.push(`proxy.frameCount ${shadow.frameCount} — no RENDER_TICK → FRAME_READY round-trip`);
}
if (!store) failures.push('window.__store missing — engine store never constructed');
else {
    if (store.formula !== 'Mandelbulb') failures.push(`expected default formula Mandelbulb, got ${store.formula}`);
    // DDFS feature slices — proves feature registration ran before store construction.
    for (const k of ['hasOptics', 'hasLighting', 'hasGeometry', 'hasColoring', 'hasMaterials', 'hasQuality']) {
        if (store[k] !== true) failures.push(`store slice missing: ${k}`);
    }
}
if (errors.some((e) => !/\b(deprecation|DevTools)\b/i.test(e))) {
    failures.push('page errors present');
}

// `hasCompiledShader` above CANNOT see a failed shader compile, so it is not
// the guard its name implies. It is a one-way latch that CompileScheduler sets
// optimistically the moment it has issued the draw (grep for
// `this.hasCompiledShader = true` in engine-gmt/engine/CompileScheduler.ts —
// the assignment is deliberately BEFORE the yields, so a concurrent perform()
// sees the new formula key). The driver reports a link failure asynchronously,
// long after the latch is set. Measured 2026-07-29: a bare syntax error injected
// into ShaderBuilder.buildFragment() left every probe value healthy — isBooted
// true, hasCompiledShader true, frameCount 216 (HIGHER than a working boot,
// because empty frames are cheap), all six store slices present, zero
// pageerrors — and this smoke exited 0.
//
// The one main-thread signal is WorkerProxy's `case 'ERROR'` console.error
// (grep `[WorkerProxy] Worker error:`), which renderWorker forwards from
// CompileScheduler's COMPILE_FAILED. The smoke was already collecting it into
// `logs` and asserting nothing on it. A `pageerror` listener never sees it —
// it is a console record, not a thrown exception.
const consoleErrors = logs.filter(
    (l) => l.startsWith('[error]') && !/\b(deprecation|DevTools)\b/i.test(l),
);
if (consoleErrors.length > 0) {
    failures.push(`console errors present (${consoleErrors.length}):\n      ` + consoleErrors.join('\n      '));
}

if (failures.length > 0) {
    console.error('\n✗ smoke FAILED');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
}
console.log('\n✓ engine-gmt-smoke boot — worker booted, shader compiled, frames delivered, store populated');
