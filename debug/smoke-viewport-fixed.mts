/**
 * Smoke test for Fixed-mode viewport + mode toggle via ViewportFrame.
 *
 * Opens fractal-toy, flips to Fixed mode, sets a specific resolution, then
 * asserts the layout ViewportFrame actually produced — not just that the
 * store round-tripped the fields. Specifically it guards ViewportFrame's
 * `boxSizing: 'content-box'` @invariant: Tailwind preflight sets
 * box-sizing:border-box globally, and combined with the frame's 1px border
 * that silently shrinks the content area (and every `width:100%` child,
 * including the canvas that gets screenshotted) by 2px per axis. A
 * 960x540 Fixed mode would export as 958x538.
 *
 * The screenshot is kept for eyeballing the letterbox, but the assertions
 * below are what make this a guard.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fractal-toy.html';
const OUT = 'debug/scratch/fractal-toy-2f-fixed.png';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Flip to Fixed mode at a 16:9 aspect ratio.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setResolutionMode('Fixed');
        s.setFixedResolution(960, 540);
    });
    await page.waitForTimeout(400);

    const mode = await page.evaluate(() => (window as any).__store.getState().resolutionMode);
    const res  = await page.evaluate(() => (window as any).__store.getState().fixedResolution);
    console.log('mode:', mode, 'fixedResolution:', res);
    if (mode !== 'Fixed' || res[0] !== 960 || res[1] !== 540) {
        throw new Error('Fixed mode setup did not land');
    }

    // ── The real assertion: did ViewportFrame lay the canvas out at
    //    exactly 960x540 of CONTENT, with the 1px border outside it? ──
    // Verified by mutation: flipping ViewportFrame's boxSizing to
    // 'border-box' makes offsetWidth 960 (not 962) and the canvas child
    // 958x538 — all three checks below trip. (getComputedStyle().width
    // does NOT discriminate; it echoes the specified 960px either way,
    // which is why the explicit box-sizing + offset checks are here.)
    const layout = await page.evaluate(() => {
        // Locate by the inline pixel size ViewportFrame writes for the
        // Fixed-mode container — NOT by box-sizing, so that removing the
        // content-box fix still finds the element and trips the size
        // assertions below with a useful message.
        const inner = (Array.from(document.querySelectorAll('div')) as HTMLElement[])
            .filter((el) => el.style.width === '960px' && el.style.height === '540px');
        if (inner.length !== 1) return { found: inner.length };
        const el = inner[0];
        const cs = getComputedStyle(el);
        const canvas = el.querySelector('canvas') as HTMLCanvasElement | null;
        return {
            found: 1,
            boxSizing: cs.boxSizing,
            borderBoxW: el.offsetWidth,
            borderBoxH: el.offsetHeight,
            canvasW: canvas ? canvas.offsetWidth : -1,
            canvasH: canvas ? canvas.offsetHeight : -1,
        };
    });
    console.log('fixed-mode layout:', JSON.stringify(layout));

    if (layout.found !== 1) {
        throw new Error(`expected exactly 1 960x540 sized container from ViewportFrame, found ${layout.found}`);
    }
    if (layout.boxSizing !== 'content-box') {
        throw new Error(`Fixed-mode container must be content-box (Tailwind preflight defaults to border-box), got ${layout.boxSizing}`);
    }
    if (layout.borderBoxW !== 962 || layout.borderBoxH !== 542) {
        throw new Error(`border box should be content + 1px border per side (962x542), got ${layout.borderBoxW}x${layout.borderBoxH}`);
    }
    if (layout.canvasW !== 960 || layout.canvasH !== 540) {
        throw new Error(`canvas child should fill the full 960x540 content area, got ${layout.canvasW}x${layout.canvasH}`);
    }

    await page.screenshot({ path: OUT, fullPage: false });
    console.log(`wrote ${OUT}`);

    if (errors.length > 0) {
        throw new Error('pageerrors: ' + errors.join('\n  '));
    }
    console.log('\n✓ Fixed mode toggle + resolution applied; canvas laid out at exactly 960x540 content (content-box invariant holds)');
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
