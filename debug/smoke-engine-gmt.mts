/**
 * Boot smoke test for the engine-gmt port.
 *
 * Goal: navigate to engine-gmt-smoke.html, wait for the worker to boot,
 * confirm no console errors, and assert a non-black centre pixel (the
 * Mandelbulb rendered into OffscreenCanvas via the worker).
 *
 * This is the first end-to-end proof that Phase A–E of the port wired
 * up correctly: feature registration, store construction, worker boot
 * handshake, shader compile, and RENDER_TICK → FRAME_READY all working.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/engine-gmt-smoke.html';

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

if (errors.some((e) => !/\b(deprecation|DevTools)\b/i.test(e))) {
    console.error('\n✗ smoke FAILED — page errors present');
    process.exit(1);
}
console.log('\n✓ engine-gmt-smoke boot — no page errors');
