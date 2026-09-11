/**
 * smoke-ge-livedrag — the GRADIENT draws during a drag; only the KNOTS wait for the release.
 *
 * The owner's rule, 2026-09-11: "the gradient needs to respond live … it is only the knots
 * build and fit that we don't need during a drag". Those are two assertions about the same
 * pointer gesture, and holding the fit satisfies the second one while quietly breaking the
 * first — which is exactly what happened: `runWorkingPipeline` handed the held config straight
 * back, the hero's bar paints from that config, and the bar froze while the palette swatches
 * (which sample the ramp) kept moving. A guard that only watched the knots would have stayed
 * green through it, so this one watches both, on the same drag, at the same instants.
 *
 *   [1] a slider drag REPAINTS the hero's bar on every move (pixels differ each sample)
 *   [2] the knots do NOT move during that drag (the hold is still in force)
 *   [3] the release lands the real fit (the knots may move; the bar still matches the ramp)
 *   [4] the same on a BAKED document, where the bar paints through `previewConfig` instead of
 *       through `value` — the two paths freeze independently and only [1] on both catches it —
 *       and there the knots are HIDDEN, not merely held (`knotsStale`)
 *   [5] the bar is the PIPELINE'S RAMP, pixel for pixel, mid-drag — not a render of the held
 *       stops. Repainting is not the same as repainting CORRECTLY: the first fix here held the
 *       stop positions and refreshed their colours, which repaints every frame and draws "a
 *       weird mix of the previous stops and the current colors" (owner, 2026-09-11). Steps
 *       [1]–[4] all stayed green through that.
 *
 * Falsified 2026-09-11 by restoring `config: holdFit ?? fit(...)` (the frozen version): [1] and
 * [4] red, "the bar did not repaint (1 distinct frame across 8 moves)" — and, watched with [1]
 * downgraded to a warning so the run could continue, [2] AND [3] stay GREEN through that break.
 * That is the whole reason [1] and [4] exist: a guard written only around "the knots hold still"
 * passes the frozen build with every assertion green.
 *
 * Falsified again by sampling `[data-gx-hero] canvas` instead of `canvas[data-gx-ramp]` — the
 * first cut did, and called a WORKING build frozen (see `barSig`).
 *
 * Wants `npm run dev` on 3400. Run: `npm run smoke:ge-livedrag`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
};

/**
 * A cheap signature of what the hero's RESULT bar is painting right now (16 samples across it).
 *
 * `canvas[data-gx-ramp]`, not `canvas`: with a face live the hero shows a SOURCE band above the
 * result, also a canvas and also full width, and it is frozen ON PURPOSE (it is the gradient you
 * started from). The first cut of this smoke sampled whichever came first in the DOM, which
 * flips as the split opens, and reported a working build as frozen.
 */
const barSig = (page: Page) =>
    page.evaluate(`(() => {
      var c = document.querySelector('[data-gx-hero] canvas[data-gx-ramp]');
      if (!c) return 'no-canvas';
      var ctx = c.getContext('2d');
      if (!ctx) return 'no-2d';
      var out = [];
      for (var i = 0; i < 16; i++) {
        var x = Math.min(c.width - 1, Math.floor((i / 15) * (c.width - 1)));
        var d = ctx.getImageData(x, 0, 1, 1).data;
        out.push(d[0] + ',' + d[1] + ',' + d[2]);
      }
      return out.join('|');
    })()`) as Promise<string>;

/**
 * The bar's pixels against the pipeline's own ramp, as the worst absolute channel error over 24
 * samples. `__gxWorking().ramp` is the truth mid-drag; `config` is not (it comes from a fit, and
 * the UI is holding one). Tolerance is for the float→byte rounding on the way into the canvas
 * and the 1536/256 = 6 px nearest upsample, which lands samples on exact texel boundaries.
 */
const barVsRamp = (page: Page) =>
    page.evaluate(`(() => {
      var c = document.querySelector('[data-gx-hero] canvas[data-gx-ramp]');
      var d = window.__gxWorking ? window.__gxWorking() : null;
      if (!c || !d || !d.ramp || !d.ramp.length) return -1;
      var ctx = c.getContext('2d');
      var worst = 0;
      for (var i = 0; i < 24; i++) {
        var t = i / 23;
        var px = Math.min(c.width - 1, Math.round(t * (c.width - 1)));
        var got = ctx.getImageData(px, 0, 1, 1).data;
        var want = d.ramp[Math.min(d.ramp.length - 1, Math.floor((px * d.ramp.length) / c.width))];
        worst = Math.max(worst, Math.abs(got[0] - Math.round(want.r)), Math.abs(got[1] - Math.round(want.g)), Math.abs(got[2] - Math.round(want.b)));
      }
      return worst;
    })()`) as Promise<number>;

/** A short signature of the PIPELINE's ramp — used to prove a drag is changing the gradient
 *  at all. A comparison of two things that are both standing still passes trivially. */
const rampSig = (page: Page) =>
    page.evaluate(`(() => {
      var d = window.__gxWorking ? window.__gxWorking() : null;
      if (!d || !d.ramp || !d.ramp.length) return 'none';
      var o = [];
      for (var i = 0; i < 8; i++) {
        var c = d.ramp[Math.round((i / 7) * (d.ramp.length - 1))];
        o.push(Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b));
      }
      return o.join('|');
    })()`) as Promise<string>;

/** Where the knots SIT — the thing the hold is meant to keep still. */
const knotSig = (page: Page) =>
    page.evaluate(`(() => {
      var ks = document.querySelectorAll('[data-gx-hero] [data-gx-knot]');
      var out = [];
      for (var i = 0; i < ks.length; i++) out.push(Math.round(ks[i].getBoundingClientRect().left));
      return ks.length + ':' + out.join(',');
    })()`) as Promise<string>;

/**
 * The knots' POSITIONS on the track (0..1), and the positions a FRESH fit of the live ramp
 * would put them at. The release is observable as these two agreeing: mid-drag the knots are
 * the held fit and the fresh fit has moved on, and `deriveWorkingNow` behind `__gxWorking`
 * always fits afresh (ADR-0117), so it is the "what they should be" side of the comparison.
 */
const knotPositions = (page: Page) =>
    page.evaluate(`(() => {
      var track = document.querySelector('[data-gx-hero] [data-gx-knot-track]');
      if (!track) return [];
      var r = track.getBoundingClientRect();
      var out = [];
      document.querySelectorAll('[data-gx-hero] [data-gx-knot]').forEach(function (k) {
        var kr = k.getBoundingClientRect();
        out.push(Math.round((((kr.left + kr.width / 2) - r.left) / r.width) * 1000) / 1000);
      });
      return out.sort(function (a, b) { return a - b; });
    })()`) as Promise<number[]>;

const fitPositions = (page: Page) =>
    page.evaluate(`(() => {
      var d = window.__gxWorking ? window.__gxWorking() : null;
      if (!d || !d.config || !d.config.stops) return [];
      return d.config.stops.map(function (s) { return Math.round(s.position * 1000) / 1000; }).sort(function (a, b) { return a - b; });
    })()`) as Promise<number[]>;

/** Do the drawn knots agree with a fresh fit, within a knot's own width on the track? */
const knotsMatchFit = (knots: number[], fit: number[]): boolean =>
    knots.length === fit.length && knots.every((k, i) => Math.abs(k - fit[i]) < 0.01);

/** The widest slider track in the open tray face — the Adjust face's first dial. */
const trackBox = (page: Page) =>
    page.evaluate(`(() => {
      var tray = document.querySelector('[data-gx-tray-root]');
      var all = tray.querySelectorAll('.cursor-ew-resize');
      var best = null, bw = 0;
      for (var i = 0; i < all.length; i++) {
        var r = all[i].getBoundingClientRect();
        if (r.width > bw && r.height > 3) { bw = r.width; best = all[i]; }
      }
      if (!best) return null;
      var r2 = best.getBoundingClientRect();
      return { x: r2.x, y: r2.y + r2.height / 2, w: r2.width };
    })()`) as Promise<{ x: number; y: number; w: number } | null>;

/** Drag the track from 20% to 80%, sampling the bar and the knots after every move. */
async function dragAndWatch(page: Page, label: string) {
    const t = await trackBox(page);
    if (!t) fail(`${label}: no slider track in the Adjust face`);
    const y = t!.y;
    const from = t!.x + t!.w * 0.2;
    const to = t!.x + t!.w * 0.8;
    const MOVES = 8;

    await page.mouse.move(from, y);
    await page.mouse.down();
    await page.waitForTimeout(120);

    const bars: string[] = [];
    const knots: string[] = [];
    const knotPos: number[][] = [];
    const fitPos: number[][] = [];
    for (let i = 1; i <= MOVES; i++) {
        await page.mouse.move(from + ((to - from) * i) / MOVES, y);
        await page.waitForTimeout(90);
        bars.push(await barSig(page));
        knots.push(await knotSig(page));
        knotPos.push(await knotPositions(page));
        fitPos.push(await fitPositions(page));
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
    return { bars, knots, knotPos, fitPos, afterKnots: await knotSig(page), afterBar: await barSig(page) };
}

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedGeSmokeState(ctx);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    console.log(`→ GET ${URL}`);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    // NOT the first tile. The wall's top row is its lightest, and a near-white ramp fits to two
    // stops — with only the two endpoints there is nothing for the hold to hold and nothing for
    // the release to move, so [3] cannot be proven on it (measured 2026-09-11: 2/2 on every
    // sample). A tile from further in has a four-or-more-stop fit.
    await page.mouse.click(box.x + 400, box.y + 260);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
    await page.waitForTimeout(1400);

    await page.click('[data-gx-tray-tab="adjust"]');
    await page.waitForTimeout(500);

    // ── the LIVE input (a picked gradient; the bar paints through the editor's `value`) ──
    const a = await dragAndWatch(page, '[1]');
    const distinctBars = new Set(a.bars).size;
    if (distinctBars < 3) fail(`[1] the bar did not repaint (${distinctBars} distinct frame(s) across ${a.bars.length} moves) — the gradient must follow the finger`);
    console.log(`✓ [1] the bar repainted through the drag (${distinctBars}/${a.bars.length} distinct frames)`);

    const distinctKnots = new Set(a.knots).size;
    if (distinctKnots !== 1) fail(`[2] the knots moved mid-drag (${distinctKnots} distinct layouts) — the fit must wait for the release`);
    console.log('✓ [2] the knots held still through the drag');

    /**
     * [3] THE RELEASE LANDS THE REAL FIT. Mid-drag the knots are the HELD fit and a fresh fit
     * of the live ramp has moved on from them; letting go must bring the two together.
     *
     * This used to be "something changed on release", comparing the bar before and after. That
     * stopped meaning anything the moment the bar started painting the pipeline's ramp
     * (ADR-0118 / the `previewRamp` fix): the ramp is the same on both sides of a release, so
     * the bar is too — correctly — and the old assertion went red on an improvement.
     */
    const heldKnots = a.knotPos[a.knotPos.length - 1];
    const heldFit = a.fitPos[a.fitPos.length - 1];
    if (heldKnots.length === 0) fail('[3] no knots to read on the track');
    if (knotsMatchFit(heldKnots, heldFit)) {
        fail(`[3] mid-drag the knots already matched a fresh fit (${heldKnots.length} stops) — the hold is not holding anything, so the release proves nothing`);
    }
    const settledKnots = await knotPositions(page);
    const settledFit = await fitPositions(page);
    if (!knotsMatchFit(settledKnots, settledFit)) {
        fail(`[3] after the release the knots are still not the real fit (${settledKnots.length} drawn vs ${settledFit.length} fitted)`);
    }
    console.log(`✓ [3] the release landed the real fit (${heldKnots.length} held → ${settledKnots.length} fitted)`);

    // ── the BAKED document (the bar paints through `previewConfig` instead) ──────────────
    // Leaving the Adjust face bakes what the drag produced, so the input is now `stops`.
    await page.click('[data-gx-tray-tab="adjust"]');
    await page.waitForTimeout(500);
    await page.click('[data-gx-tray-tab="adjust"]');
    await page.waitForTimeout(600);
    const edited = await page.evaluate(`(() => (window.__gxWorking ? window.__gxWorking().input.kind : null))()`);
    if (edited !== 'stops') fail(`[4] expected a baked stops document to test the other paint path (input is ${edited})`);

    const b = await dragAndWatch(page, '[4]');
    const distinctB = new Set(b.bars).size;
    if (distinctB < 3) fail(`[4] on a baked document the bar did not repaint (${distinctB} distinct frame(s)) — previewConfig freezes independently of value`);
    /**
     * Over a BAKED document the knots are not merely held, they are GONE: they describe the
     * document underneath rather than what the bar is showing, so the editor hides them while
     * `previewConfig` is set (owner, 2026-09-11 — "the stops should only be visible when they
     * are current"; `knotsStale` in AdvancedGradientEditor). Two assertions, because "hidden
     * the whole way" is NOT the contract and asserting it is red on a correct build: a dial
     * dragged back through its default makes the pipeline the identity for a frame, the
     * document IS the bar again, and the knots are right to come back. Measured here — Hue
     * rotate sweeps through 0 mid-drag.
     *
     * So: they must vanish at least once (the rule fires), and wherever they ARE drawn they
     * must be in the same place every time (the fit is still held). A count of zero satisfies
     * "they did not move" vacuously, which is why stillness alone is not enough here.
     */
    const hidden = b.knots.filter((k) => k === '0:').length;
    const shown = [...new Set(b.knots.filter((k) => k !== '0:'))];
    if (hidden === 0) fail(`[4] the stale knots were never hidden over a baked document (${b.knots[0]})`);
    if (shown.length > 1) fail(`[4] the knots moved while they were drawn (${shown.length} distinct layouts)`);
    console.log(`✓ [4] the same holds on a baked document; its stale knots hide (${hidden}/${b.knots.length} samples) and never move (${distinctB}/${b.bars.length} bar frames)`);

    // ── [5] the bar must BE the pipeline's ramp mid-drag, not an approximation of it ──────
    /**
     * PHASE, not the curve plot, and the reason is worth writing down. The owner saw this in
     * Curves — "a weird mix of the previous stops and the current colors" — because a curve
     * moves features ALONG the ramp, which is the case a held fit approximates worst (its stop
     * positions are held; only their colours refresh). Phase does the same thing: it slides the
     * whole gradient along t. Same paint path, same error mode, and a drag target that can
     * actually be hit.
     *
     * The curve plot cannot be: its keys are drawn on a canvas with no DOM handle, and where
     * they sit depends on the fit of whichever gradient was picked. Two cuts of this step aimed
     * at the plot and BOTH passed while proving nothing — one grabbed empty space, and one
     * probed for a key and then re-grabbed from the same spot after the probe had dragged the
     * key away. Every sample read 0, which is also what a correct build reads.
     */
    // The tab TOGGLES, and step [4] may have left the face open on it — clicking blind closes
    // it and then there are no dials to find (it did, first run).
    const faceNow = await page.evaluate(`(() => { var t = document.querySelector('[data-gx-tray-root]'); return t ? (t.dataset.gxTray || null) : null; })()`);
    if (faceNow !== 'adjust') {
        await page.click('[data-gx-tray-tab="adjust"]');
        await page.waitForTimeout(700);
    }
    /**
     * The FOURTH dial in the Adjust face is Phase. The face is three `AutoFeaturePanel` bins
     * whitelisting `[hueRotate, chroma, contrast]`, `[phase, repeats, bands]` and the Noise
     * group, in that order — grep `whitelistParams` in `Tray.tsx`. Every slider carries the
     * same `data-help-id="ui.slider"` and no per-param hook, and matching the LABEL is not an
     * option either: the dial has to be found by position.
     *
     * If that order ever changes this step does not silently degrade — it drags some other dial,
     * and the `movedRamp` check below still requires the gradient to move, so the comparison
     * stays honest even when the dial is not the one named here.
     */
    const PHASE_INDEX = 3;
    const phase = await page.evaluate(`(() => {
      var tray = document.querySelector('[data-gx-tray-root]');
      var sliders = tray.querySelectorAll('[data-help-id="ui.slider"]');
      var el = sliders[${PHASE_INDEX}];
      if (!el) return null;
      var track = el.querySelector('.cursor-ew-resize');
      if (!track) return null;
      var r = track.getBoundingClientRect();
      return { x: r.x, y: r.y + r.height / 2, w: r.width, of: sliders.length };
    })()`) as { x: number; y: number; w: number; of: number } | null;
    if (!phase) fail(`[5] no dial ${PHASE_INDEX} in the Adjust face`);

    await page.mouse.move(phase!.x + phase!.w * 0.15, phase!.y);
    await page.mouse.down();
    const errs: number[] = [];
    const sigs: string[] = [];
    for (let i = 1; i <= 6; i++) {
        await page.mouse.move(phase!.x + phase!.w * (0.15 + i * 0.1), phase!.y);
        await page.waitForTimeout(120);
        errs.push(await barVsRamp(page));
        sigs.push(await rampSig(page));
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
    const settled = await barVsRamp(page);

    // Did the gradient move at all? Without this the comparison below is two still images —
    // the failure mode that let two earlier cuts of this step pass on a broken build.
    const movedRamp = new Set(sigs).size;
    if (movedRamp < 3) fail(`[5] the Phase drag did not change the gradient (${movedRamp} distinct ramps across ${sigs.length} moves) — this step would prove nothing`);

    if (errs.some((e) => e < 0) || settled < 0) fail('[5] could not compare the bar with the pipeline ramp (no ramp on the debug handle?)');
    /**
     * EXACT, not close. The bar upsamples the same 256 texels nearest-neighbour, so a correct
     * build reads 0 and the only slack needed is float→byte rounding (Uint8ClampedArray rounds
     * half-to-even, `Math.round` half-up, so a value landing on x.5 can differ by one).
     *
     * The tolerance matters more than it looks: measured against the old held-stops paint, a
     * PHASE drag came out at 6 — close enough that a "within a few levels" threshold passes the
     * broken build. A curve edit is far worse than 6, which is why the owner saw it there first
     * and not on the dials.
     */
    const TOL = 1;
    const worst = Math.max(...errs);
    if (worst > TOL) fail(`[5] mid-drag the bar is not the pipeline's ramp (worst channel error ${worst}) — it is painting a held approximation`);
    if (settled > TOL) fail(`[5] after the drag the bar still differs from the ramp (worst channel error ${settled})`);
    console.log(`✓ [5] dial ${PHASE_INDEX} of ${phase!.of} (Phase) slid the gradient ${movedRamp} ways, and the bar WAS the pipeline's ramp throughout (worst channel error ${worst} mid-drag, ${settled} settled)`);

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — the gradient follows the finger, exactly; only the knots wait for the release');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
