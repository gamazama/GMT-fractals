/**
 * smoke-ge-setsave — filing a gradient is DRAWN on the chip that takes it.
 *
 * The owner's ask, 2026-09-11: the gradient appears in the background of the set's name chip
 * and, on the save, "eases out to a vertical scale down from the centre … the text should also
 * light up so that saving is fun", slower and brighter from the ♥.
 *
 * An animation is easy to write and easy to break silently — a renamed keyframe, a class that
 * Tailwind never emits because nothing references it, a chip that re-renders and drops the
 * element mid-flight. So this asserts the four things that make it visible at all:
 *
 *   [1] ♥ paints the fill on a chip, carrying the GRADIENT (a `linear-gradient` background)
 *   [2] the fill is actually SHRINKING — its transform matrix is sampled twice mid-flight and
 *       the vertical scale must have fallen between them — and the label is animating too
 *   [3] the ♥'s flash is the SLOW one (its duration is the slow constant, not the quick one)
 *   [4] it clears itself: the element is gone after the animation, so a chip is never left
 *       wearing a gradient that is not its own
 *
 * Falsified 2026-09-11 by deleting the `@keyframes set-save-out` block from `index.css`:
 * [2] red, "the fill has no transform to watch (early NaN, late NaN)" — with no keyframes the
 * element is never transformed at all, so `transform` stays `none` and there is nothing to
 * measure, which the NaN guard catches before the shrink comparison. The FIRST cut of [2] asserted a resolved `animation-name`
 * and stayed GREEN through that break — `getComputedStyle` reports the name a rule declares
 * whether or not any `@keyframes` of that name exists, so it proved the Tailwind utility was
 * emitted and nothing about the animation. Sampling the transform is what actually watches it
 * move; the weaker assertion is kept alongside only to name the "utility never emitted" case
 * separately when it happens.
 *
 * Wants `npm run dev` on 3400. Run: `npm run smoke:ge-setsave`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
};

const flashState = (page: Page) =>
    page.evaluate(`(() => {
      var el = document.querySelector('[data-gx-set-save]');
      if (!el) return { present: false };
      var cs = getComputedStyle(el);
      var chip = el.closest('[data-gx-set]');
      var label = chip ? chip.querySelector('.animate-set-save-text') : null;
      var ls = label ? getComputedStyle(label) : null;
      var bloom = el.querySelector('.animate-set-save-bloom');
      return {
        present: true,
        setId: chip ? chip.dataset.gxSet : null,
        background: (cs.backgroundImage || '').slice(0, 22),
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        transformOrigin: cs.transformOrigin,
        transform: cs.transform,
        labelAnimation: ls ? ls.animationName : null,
        bloom: !!bloom,
      };
    })()`) as Promise<Record<string, unknown>>;

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
    await page.mouse.click(box.x + 400, box.y + 260);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
    await page.waitForTimeout(1500);

    const heart = page.locator('[data-gx-hero] button[title*="Keep"], [data-gx-hero] button[aria-label*="Keep"]').first();
    if (!(await heart.count())) fail('no ♥ in the hero');
    await heart.click();
    await page.waitForTimeout(90);

    const s = await flashState(page);
    if (!s.present) fail('[1] the ♥ painted no fill on any chip');
    if (!String(s.background).includes('linear-gradient')) fail(`[1] the fill is not a gradient (background-image: ${s.background})`);
    console.log(`✓ [1] the ♥ filled chip "${s.setId}" with the gradient`);

    if (!s.animationName || s.animationName === 'none') fail(`[2] the fill carries no animation at all (animation-name: none) — the utility never reached the build`);
    if (!s.labelAnimation || s.labelAnimation === 'none') fail(`[2] the label is not lighting up (animation-name: ${s.labelAnimation})`);

    const ms = parseFloat(String(s.animationDuration)) * 1000;
    if (!(ms > 600)) fail(`[3] the ♥'s flash is not the slow one (${s.animationDuration})`);
    if (!s.bloom) fail('[3] the ♥ has no bloom over the fill');

    // WATCH IT MOVE. `scaleY` holds at 1 for the first 55% and then collapses, so the two
    // samples straddle that: one just after the hold, one near the end.
    const scaleYAt = async (t: number): Promise<number> => {
        await page.waitForTimeout(t);
        const st = await flashState(page);
        const m = /matrix\(([^)]+)\)/.exec(String(st.transform ?? ''));
        if (!m) return NaN;
        return parseFloat(m[1].split(',')[3]);
    };
    const early = await scaleYAt(Math.round(ms * 0.62) - 90);
    const late = await scaleYAt(Math.round(ms * 0.28));
    if (!(Number.isFinite(early) && Number.isFinite(late))) fail(`[2] the fill has no transform to watch (early ${early}, late ${late})`);
    if (!(late < early - 0.05)) fail(`[2] the fill never shrank (scaleY ${early.toFixed(3)} → ${late.toFixed(3)}) — the keyframes did not reach the build`);
    console.log(`✓ [2] the fill collapses about its centre (scaleY ${early.toFixed(2)} → ${late.toFixed(2)}, origin ${s.transformOrigin}) and the label lights with it (${s.labelAnimation})`);
    console.log(`✓ [3] the ♥ runs the slow flash (${s.animationDuration}) with its bloom`);

    await page.waitForTimeout(600);
    const after = await flashState(page);
    if (after.present) fail('[4] the fill is still on the chip after the animation');
    console.log('✓ [4] the fill clears itself');

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — a save is drawn on the chip that takes it');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
