/**
 * smoke-ge-cursors — every surface names its own gesture, and a gesture under way keeps its name.
 *
 * The editor and the wall's range pad each carry a small cursor vocabulary (ADR-0118): the bar
 * SELECTS (a drag there marquees the knots), the knot track MAKES (a press inserts one), and the
 * pad's strip moves or resizes its window depending on how near a bound you are. Those were one
 * cursor, or none, until 2026-09-11.
 *
 *   [1] at rest: the hero's bar is `crosshair` and its knot track is `copy` — two gestures, two
 *       cursors, on the elements that perform them
 *   [2] the pad strip under the wall's spectrum reads `ew-resize` at a bound and `move` inside
 *   [3] a marquee begun on the bar KEEPS `crosshair` for the whole drag, including while the
 *       pointer is over the knot track, which advertises `copy` when idle
 *   [4] and the cursors come back afterwards
 *
 * [3] is the one with a trap in it: `document.body.style.cursor` looks like the fix and is not,
 * because a descendant setting its own `cursor` beats an inherited one. The editor's root carries
 * the drag's cursor and forces descendants to `inherit`; falsified by dropping that class, which
 * reds [3] with `copy` over the track mid-marquee.
 *
 * Wants `npm run dev` on 3400. Run: `npm run smoke:ge-cursors`.
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';

const fail = (msg: string): never => {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
};

const cursorAt = (page: Page, x: number, y: number) =>
    page.evaluate(`(() => { var t = document.elementFromPoint(${Math.round(x)}, ${Math.round(y)}); return t ? getComputedStyle(t).cursor : '-'; })()`) as Promise<string>;

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

    // [2] first, while the wall is still the whole ground and the pad is at its widest
    const strip = await page.locator('[data-gx-pad-strip]').boundingBox();
    if (!strip) fail('[2] no pad strip under the spectrum');
    const at = async (fx: number) => {
        const x = strip!.x + strip!.width * fx;
        const y = strip!.y + strip!.height / 2;
        await page.mouse.move(x, y);
        await page.waitForTimeout(90);
        return cursorAt(page, x, y);
    };
    const edge = await at(0.02);
    const mid = await at(0.5);
    if (edge !== 'ew-resize') fail(`[2] the pad strip's bound should resize, not ${edge}`);
    if (mid !== 'move') fail(`[2] the pad strip's middle should move the window, not ${mid}`);
    console.log(`✓ [2] the pad strip: ${edge} at a bound, ${mid} inside`);

    const wall = page.locator('[data-gx-keepselect] canvas').first();
    await wall.waitFor({ state: 'visible', timeout: 15000 });
    const box = (await wall.boundingBox())!;
    await page.mouse.click(box.x + 400, box.y + 260);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => fail('no hero after a wall click'));
    await page.waitForTimeout(1500);

    const bar = (await page.locator('[data-gx-hero] canvas[data-gx-ramp]').boundingBox())!;
    const track = (await page.locator('[data-gx-hero] [data-gx-knot-track]').boundingBox())!;
    const bx = bar.x + bar.width * 0.3;
    const by = bar.y + bar.height * 0.5;
    const tx = bar.x + bar.width * 0.55;
    const ty = track.y + track.height / 2;

    const barIdle = await cursorAt(page, bx, by);
    const trackIdle = await cursorAt(page, tx, ty);
    if (barIdle !== 'crosshair') fail(`[1] the bar hosts the marquee and should say so — got ${barIdle}`);
    if (trackIdle !== 'copy') fail(`[1] the knot track makes a knot and should say so — got ${trackIdle}`);
    console.log(`✓ [1] at rest the bar is ${barIdle} and the knot track is ${trackIdle}`);

    await page.mouse.move(bx, by);
    await page.mouse.down();
    await page.waitForTimeout(120);
    const onBar = await cursorAt(page, bx, by);
    await page.mouse.move(tx, ty, { steps: 6 });
    await page.waitForTimeout(150);
    const overTrack = await cursorAt(page, tx, ty);
    await page.mouse.move(bx + 200, by, { steps: 4 });
    await page.waitForTimeout(150);
    const backOnBar = await cursorAt(page, bx + 200, by);
    await page.mouse.up();
    await page.waitForTimeout(300);

    if (onBar !== 'crosshair') fail(`[3] the marquee did not start as a selection (${onBar})`);
    if (overTrack !== 'crosshair') fail(`[3] the cursor changed mid-marquee (${overTrack} over the knot track) — a gesture under way keeps its own cursor`);
    if (backOnBar !== 'crosshair') fail(`[3] the cursor did not come back to the selection (${backOnBar})`);
    console.log('✓ [3] a marquee keeps crosshair the whole way, over the track included');

    const trackAfter = await cursorAt(page, tx, ty);
    if (trackAfter !== 'copy') fail(`[4] after the drag the knot track should be ${trackIdle} again, not ${trackAfter}`);
    console.log(`✓ [4] the cursors come back (${trackAfter} over the track)`);

    if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
    console.log('\nPASS — every surface names its gesture, and a gesture under way keeps its name');
    await browser.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
