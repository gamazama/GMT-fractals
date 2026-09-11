/**
 * prof-ge-drag — where the frame goes while a GE v2 dial or curve knot is being dragged.
 *
 * Boots the v2 shell, picks a gradient, opens a tray face, and drags something in it with
 * synthesized pointer moves while a CDP CPU profile runs. Reports self-time by function so
 * the answer is "this function, this many ms", not "the pipeline feels heavy".
 *
 * Also counts long tasks (>50 ms) and the rAF gaps during the drag, because a profile tells
 * you what ran and the gaps tell you whether the finger waited.
 *
 * Firefox has no CDP, so BROWSER=firefox gives frame timings only — enough to say whether
 * the finger waited; the WHERE comes from the chromium run. ENGINE_URL points it at a
 * production build (`vite preview`), which is the only honest place to read the totals:
 * React's dev build spends more in its own validation than this app spends in colour maths.
 *
 * Measured with it on 2026-09-11, an Adjust drag at 1280x800 over a ~40-stop gradient:
 * `sampleSorted` 112 ms -> 28 ms and `fitRampToStops` out of the profile entirely, after the
 * strip preview stopped re-sorting per pixel and the fit started honouring the drag hold.
 *
 * Run: `npm run dev` on 3400, then `npm run prof:ge-drag -- [adjust|curves]`.
 * Env: BROWSER=firefox · ENGINE_URL=... · CX/CY/DY (aim the curves drag) · SHOT=path.
 */
import { chromium, firefox, type Page, type CDPSession } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const WHICH = (process.argv[2] || 'adjust') as 'adjust' | 'curves';

interface ProfNode {
    id: number;
    callFrame: { functionName: string; url: string; lineNumber: number };
    hitCount?: number;
    children?: number[];
}

const selfTime = (profile: { nodes: ProfNode[]; startTime: number; endTime: number; samples?: number[]; timeDeltas?: number[] }) => {
    const byId = new Map<number, ProfNode>();
    for (const n of profile.nodes) byId.set(n.id, n);
    const acc = new Map<string, number>();
    const samples = profile.samples ?? [];
    const deltas = profile.timeDeltas ?? [];
    for (let i = 0; i < samples.length; i++) {
        const n = byId.get(samples[i]);
        if (!n) continue;
        const dt = (deltas[i] ?? 0) / 1000; // µs → ms
        const f = n.callFrame;
        const url = f.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
        const key = `${f.functionName || '(anonymous)'}  ${url}:${f.lineNumber + 1}`;
        acc.set(key, (acc.get(key) ?? 0) + dt);
    }
    return [...acc.entries()].sort((a, b) => b[1] - a[1]);
};

/** Watch rAF gaps + long tasks in the page for the duration of the drag. */
const WATCH_SRC = `(() => {
  window.__prof = { frames: [], longs: [] };
  var last = performance.now();
  function tick() {
    var now = performance.now();
    window.__prof.frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver(function (l) {
      var es = l.getEntries();
      for (var i = 0; i < es.length; i++) window.__prof.longs.push(es[i].duration);
    }).observe({ entryTypes: ['longtask'] });
  } catch (e) {}
})()`;

const installWatch = (page: Page) => page.evaluate(WATCH_SRC);

const READ_SRC = `(() => {
  var f = (window.__prof ? window.__prof.frames : []).slice(2);
  var sorted = f.slice().sort(function (a, b) { return a - b; });
  var longs = window.__prof ? window.__prof.longs : [];
  var sum = 0;
  for (var i = 0; i < longs.length; i++) sum += longs[i];
  return {
    frames: f.length,
    median: sorted[Math.floor(sorted.length / 2)] || 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
    worst: sorted[sorted.length - 1] || 0,
    longs: longs.length,
    longMs: Math.round(sum),
  };
})()`;

const readWatch = (page: Page) => page.evaluate(READ_SRC) as Promise<{ frames: number; median: number; p95: number; worst: number; longs: number; longMs: number }>;

async function drag(page: Page, from: { x: number; y: number }, dx: number, steps: number) {
    const dy = Number(process.env.DY) || 0;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
        const f = Math.sin((i / steps) * Math.PI);
        await page.mouse.move(from.x + (dx * i) / steps, from.y + dy * f);
        await page.waitForTimeout(16);
    }
    await page.mouse.up();
}

async function main() {
    const ff = process.env.BROWSER === 'firefox';
    const browser = await (ff ? firefox : chromium).launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedGeSmokeState(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    await page.mouse.click(box.x + 24, box.y + 14);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 });
    await page.waitForTimeout(1200);

    await page.click(`[data-gx-tray-tab="${WHICH}"]`);
    await page.waitForTimeout(600);

    // Find the thing to drag.
    let target: { x: number; y: number };
    let dx = 160;
    if (WHICH === 'adjust') {
        const t = await page.evaluate(`(() => {
            var tray = document.querySelector('[data-gx-tray-root]');
            var all = tray.querySelectorAll('.cursor-ew-resize');
            var best = null, bw = 0;
            for (var i = 0; i < all.length; i++) {
              var r = all[i].getBoundingClientRect();
              if (r.width > bw && r.height > 3) { bw = r.width; best = all[i]; }
            }
            if (!best) return null;
            var r2 = best.getBoundingClientRect();
            return { x: r2.x + r2.width * 0.5, y: r2.y + r2.height / 2, w: r2.width, tag: best.tagName, cls: String(best.className).slice(0, 60) };
        })()`) as { x: number; y: number; w: number; tag: string; cls: string } | null;
        if (!t) { console.log('no slider found in the Adjust face'); await browser.close(); return; }
        console.log(`dragging ${t.tag}.${t.cls} (w=${Math.round(t.w)})`);
        target = { x: t.x, y: t.y };
        dx = Math.min(120, t.w * 0.3);
    } else {
        const t = await page.evaluate(() => {
            const tray = document.querySelector('[data-gx-tray-root]')!;
            const cv = tray.querySelector('canvas') as HTMLCanvasElement | null;
            if (!cv) return null;
            const r = cv.getBoundingClientRect();
            return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.5, w: r.width, h: r.height };
        });
        if (!t) { console.log('no curve canvas found'); await browser.close(); return; }
        console.log(`dragging the curve plot (${Math.round(t.w)}×${Math.round(t.h)})`);
        if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: false });
        target = { x: Number(process.env.CX) || t.x, y: Number(process.env.CY) || t.y };
        dx = 100;
    }

    // Firefox has no CDP: frame timings only there, which is enough to say whether the
    // finger waited — the WHERE comes from the Chromium run.
    let profile: unknown = null;
    let cdp: CDPSession | null = null;
    if (!ff) {
        cdp = await ctx.newCDPSession(page);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    }
    await installWatch(page);
    if (cdp) await cdp.send('Profiler.start');
    await drag(page, target, dx, 40);
    if (cdp) profile = (await cdp.send('Profiler.stop')).profile;
    const watch = await readWatch(page);

    console.log(`\n── frames during the drag (${WHICH}) ──`);
    console.log(`  ${watch.frames} frames · median ${watch.median.toFixed(1)} ms · p95 ${watch.p95.toFixed(1)} ms · worst ${watch.worst.toFixed(1)} ms`);
    console.log(`  long tasks: ${watch.longs} (${watch.longMs} ms total)`);

    if (!profile) { await browser.close(); return; }
    const rows = selfTime(profile as never);
    const total = rows.reduce((a, b) => a + b[1], 0);
    console.log(`\n── self time, top 30 of ${Math.round(total)} ms sampled ──`);
    for (const [k, ms] of rows.slice(0, 30)) {
        if (ms < 0.5) break;
        console.log(`  ${ms.toFixed(1).padStart(7)} ms  ${((ms / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
    }

    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
