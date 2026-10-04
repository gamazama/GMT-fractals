/**
 * Smoke: nothing on the page repaints every frame.
 *
 * WHY THIS IS A PERFORMANCE GUARD AND NOT A TIDINESS ONE. The fractal renders
 * in a worker, but its WebGL commands are decoded on the GPU process's main
 * thread — the same thread that presents the browser window. Anything in the
 * DOM that changes on every frame (a smooth infinite CSS animation, an overlay
 * that rewrites its attributes each tick) makes the compositor present the
 * whole window at 60 Hz, and on Windows, after a focus change, each of those
 * presents blocks that thread for ~15 ms. The fractal gets what is left.
 * Measured 2026-10-04 with `npm run bench:audio`: a 6 ms frame delivered at
 * 14 fps instead of 60, with one pulsing 6 px dot as the cause — the "this
 * slider is modulated" indicator, so it appeared exactly when audio modulation
 * was switched on.
 *
 * WHAT IS ASSERTED, in two app states:
 *
 *   [1] STILL — converged, nothing modulated, a point light with its gizmo up
 *       - the light gizmo is actually mounted and visible (otherwise the next
 *         line passes vacuously)
 *       - no DOM node is written more than IDLE_MAX times a second
 *       - no smooth infinite CSS animation is running
 *
 *   [2] MODULATING — an LFO on a formula param, its slider on screen
 *       - the slider's live indicator is actually present (again: not vacuous)
 *       - no DOM node is written more than LIVE_MAX times a second (the store
 *         publishes live values at 20 Hz; a per-frame writer shows as ~60)
 *       - no smooth infinite CSS animation is running
 *
 * "Smooth infinite" = `iterations: Infinity` with any keyframe easing that is
 * not `steps(...)`. A stepped animation presents only when its value changes
 * (measured: 3/s for `animate-pulse-live`, against 60/s for `animate-pulse`),
 * so it is allowed; `animate-spin` is not exempted, because nothing should be
 * spinning in either of these states.
 *
 * NOT asserted: the frame rate itself. That needs a real GPU and real window
 * focus changes — `npm run bench:audio -- --scenarios=lfo,lfo@bg,lfo@fg` is
 * the measurement; this is the cheap headless tripwire for the two causes
 * found so far.
 *
 * FALSIFIED 2026-10-04 — three breaks, each red on its own assertion; the log
 * is at the bottom of this file.
 *
 *   npm run smoke:idle-damage           (dev server on :3400)
 *   npm run smoke:with-server -- npx tsx debug/smoke-idle-damage.mts
 */
import { chromium } from 'playwright';

const BASE = process.env.ENGINE_URL || 'http://localhost:3400';
const URL = /\.html($|\?)/.test(BASE) ? BASE : `${BASE.replace(/\/$/, '')}/app-gmt.html`;

/** Writes per second to one node that still count as "not every frame". */
const IDLE_MAX = 5;
/** 20 Hz live-modulation publish plus headroom; a per-frame writer is ~60. */
const LIVE_MAX = 35;
const WINDOW_MS = 3000;

const browser = await chromium.launch({ args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader && !window.__gmtProxy.isCompiling', null, { timeout: 120_000, polling: 200 });

// Kept as STRINGS: tsx/esbuild wraps named inner functions in `__name(...)`,
// which does not exist in the page.
const SAMPLE = `(async (windowMs) => {
  const sel = (el) => { if (!el || !el.tagName) return '?'; const c = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || ''; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(c).split(' ').slice(0, 5).join('.'); };
  const perNode = new Map();
  const mo = new MutationObserver((list) => { for (const m of list) { const t = m.target.nodeType === 3 ? m.target.parentElement : m.target; perNode.set(t, (perNode.get(t) || 0) + 1); } });
  mo.observe(document.documentElement, { subtree: true, attributes: true, childList: true, characterData: true });
  await new Promise(r => setTimeout(r, windowMs));
  mo.disconnect();
  const secs = windowMs / 1000;
  const writers = [...perNode.entries()].map(([n, c]) => ({ node: sel(n), perSec: +(c / secs).toFixed(1) })).sort((a, b) => b.perSec - a.perSec);
  const smooth = document.getAnimations().filter((a) => {
    if (a.playState !== 'running' || !a.effect) return false;
    if (a.effect.getTiming().iterations !== Infinity) return false;
    return a.effect.getKeyframes().some(k => !String(k.easing).startsWith('steps('));
  }).map(a => (a.animationName || '?') + ' on ' + sel(a.effect.target));
  return { writers: writers.slice(0, 8), smooth };
})`;

let failures = 0;
const ok = (cond: boolean, msg: string, detail?: unknown) => {
    if (cond) console.log(`  ok: ${msg}`);
    else { failures++; console.error(`  FAIL: ${msg}`, detail === undefined ? '' : JSON.stringify(detail)); }
};

// ── [1] STILL ────────────────────────────────────────────────────────────
console.log('[1] still scene — converged, a point light with its gizmo up');
await page.evaluate(`(() => {
  const s = window.__store.getState();
  // A visible point light with its gizmo shown — the overlay this guard is for.
  const lights = s.lighting?.lights ?? [];
  let idx = lights.findIndex(l => l.visible && l.type !== 'Directional');
  if (idx < 0) { idx = 0; s.updateLight({ index: 0, params: { type: 'Point', visible: true } }); }
  if (!s.showLightGizmo && s.setShowLightGizmo) s.setShowLightGizmo(true);
  s.setAnimations([]);
  s.setSampleCap(1);        // converge on the first frame so the render loop idles
})()`);
await page.waitForFunction('window.__gmtProxy.accumulationCount >= 1', null, { timeout: 120_000, polling: 250 }).catch(() => {});
await page.waitForTimeout(3500);   // let the three-shot light-orb ping finish

const gizmo = await page.evaluate(`(() => {
  const line = document.querySelector('.axis-x-line');
  const box = line && line.closest('div');
  return { mounted: !!line, shown: !!box && getComputedStyle(box).display !== 'none', x2: line ? line.getAttribute('x2') : null };
})()`) as { mounted: boolean; shown: boolean; x2: string | null };
ok(gizmo.mounted && gizmo.shown, 'the light gizmo is mounted and visible (the still check is not vacuous)', gizmo);

const still = await page.evaluate(`${SAMPLE}(${WINDOW_MS})`) as { writers: { node: string; perSec: number }[]; smooth: string[] };
ok((still.writers[0]?.perSec ?? 0) <= IDLE_MAX, `a still scene produces no DOM writes from the light gizmo (busiest node ≤ ${IDLE_MAX}/s)`, still.writers.slice(0, 4));
ok(still.smooth.length === 0, 'no smooth infinite CSS animation is running while still', still.smooth);

// ── [2] MODULATING ───────────────────────────────────────────────────────
console.log('[2] modulating — an LFO on a formula param');
await page.evaluate(`(() => {
  const s = window.__store.getState();
  s.setSampleCap(0);
  s.setLfosEnabled(true);
  s.setAnimations([{ id: 'idle-damage-lfo', enabled: true, target: 'coreMath.paramA', shape: 'Sine', period: 1.3, amplitude: 0.05, baseValue: s.coreMath.paramA, phase: 0, smoothing: 0 }]);
})()`);
await page.waitForTimeout(1500);

const live = await page.evaluate(`(() => ({
  dots: document.querySelectorAll('.animate-pulse-live, .animate-pulse').length,
  liveKeys: Object.keys(window.__store.getState().liveModulations || {}).length,
}))()`) as { dots: number; liveKeys: number };
ok(live.liveKeys > 0 && live.dots > 0, 'the LFO is live and its slider indicator is on screen (the modulating check is not vacuous)', live);

const mod = await page.evaluate(`${SAMPLE}(${WINDOW_MS})`) as { writers: { node: string; perSec: number }[]; smooth: string[] };
ok((mod.writers[0]?.perSec ?? 0) <= LIVE_MAX, `while modulating, no DOM node is written every frame (busiest node ≤ ${LIVE_MAX}/s)`, mod.writers.slice(0, 4));
ok(mod.smooth.length === 0, 'no smooth infinite CSS animation is running while modulating', mod.smooth);

await page.evaluate(`window.__store.getState().setAnimations([])`);
await browser.close();

ok(errors.length === 0, 'no page errors', errors.slice(0, 3));
if (failures) { console.error(`\n✗ idle-damage: ${failures} failure(s)`); process.exit(1); }
console.log('\n✓ idle-damage: nothing repaints every frame, still or modulating');

/*
 * ── FALSIFICATION LOG (2026-10-04) ─────────────────────────────────────────
 * Each break applied to the source, the smoke run, the break reverted.
 *
 *  A. `SinglePositionGizmo.update` writes unconditionally (the
 *     `if (rec[name] === value) return` guard removed) → exit 1, 2 failures:
 *     [1] "a still scene produces no DOM writes from the light gizmo" with
 *     every axis line at 129 writes/s, and [2] the same lines at 42/s.
 *  B. The slider's modulated dot back on smooth `animate-pulse`
 *     (components/inputs/ScalarInput.tsx) → exit 1, 1 failure: [2] "no smooth
 *     infinite CSS animation is running while modulating", naming the dot.
 *     [1] stays green — the dot only exists while something is modulated,
 *     which is why the bug only showed with audio on.
 *  C. The light-orb ping infinite again (`[animation-iteration-count:3]`
 *     removed in LightControls.tsx) → exit 1, 2 failures: "no smooth infinite
 *     CSS animation" in both states, naming three `ping` rings.
 *  Restored → exit 0.
 *
 * NOT falsified here: redefining `pulse-live` itself as a smooth animation in
 * tailwind.config.js. That needs a dev-server restart to take effect, so it
 * was not run as a break; the keyframe-easing check that catches B would
 * catch it the same way.
 */
