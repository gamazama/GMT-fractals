/**
 * Smoke: mobile layout detection and the viewport shell branch.
 *
 * Until this existed nothing guarded mobile layout at all. The two guards
 * `.claude/rules/mobile-layout.md` cited (`smoke:viewport`,
 * `smoke:viewport-fixed`) both stayed green with the 768 px breakpoint set
 * to 2000 — a healthy guard cited for the wrong thing (overnight audit,
 * cycle 5). This is the audit's probe promoted: it boots
 * gradient-explorer.html in a Pixel 5 context and a desktop context and
 * asserts what the store and the MobileViewportShell actually do.
 *
 *   [1] Pixel 5 portrait: `isDeviceMobile` true, `isPortrait` true, the
 *       shell is `position: sticky` (the mobile branch) and fills the
 *       viewport height.
 *   [2] Same context rotated to 851×393: `isPortrait` false, still mobile
 *       (coarse pointer) — the module-level resize listener updated the
 *       store.
 *   [3] Desktop 1400×900: not mobile, not portrait, shell `position: fixed`.
 *   [4] Desktop shrunk to 600×900: the listener flips `isDeviceMobile` true
 *       and `isPortrait` true (width < 768, no touch needed).
 *   [5] Desktop 700×700: square counts as LANDSCAPE (`isPortrait` false),
 *       per the invariant in hooks/useMobileLayout.ts.
 *
 * Run: `npm run smoke:mobile-layout` (needs the Vite dev server on :3400).
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   uiSlice's boot-seed copy of the breakpoint set 768 → 2000: [3] red
 *   twice ("desktop seeded isDeviceMobile=true at 1400px", "shell position
 *   is sticky, expected fixed"), everything else green — the boot seed and
 *   the resize listener are separate copies, and this is the one
 *   `smoke:viewport` could never see. The listener's setState no-op'd:
 *   [2] and [4] red (three assertions), [1] and [3] green because boot
 *   seeds survive, and [5] green only because the desktop seed was already
 *   landscape — the store simply never updated afterwards.
 */
import { chromium, devices } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer.html';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };

type Reading = {
    hasStore: boolean; isDeviceMobile: boolean | undefined; isPortrait: boolean | undefined;
    innerWidth: number; innerHeight: number; coarse: boolean;
    shellPos: string; shellH: string;
};
const read = async (page: import('playwright').Page): Promise<Reading> => page.evaluate(() => {
    const s = (window as any).__store?.getState?.();
    const shell = (Array.from(document.querySelectorAll('div')) as HTMLElement[])
        .find((el) => {
            const cs = getComputedStyle(el);
            return (cs.position === 'sticky' || cs.position === 'fixed') && el.className.includes('select-none');
        });
    return {
        hasStore: !!s,
        isDeviceMobile: s?.isDeviceMobile,
        isPortrait: s?.isPortrait,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        coarse: window.matchMedia('(pointer: coarse)').matches,
        shellPos: shell ? getComputedStyle(shell).position : 'NOT-FOUND',
        shellH: shell ? getComputedStyle(shell).height : 'NOT-FOUND',
    };
});
const px = (s: string) => Number.parseFloat(s);

const browser = await chromium.launch({ args: ['--disable-gpu-sandbox'] });

console.log('[1] Pixel 5 portrait');
const mob = await browser.newContext({ ...devices['Pixel 5'] });
const mp = await mob.newPage();
await mp.goto(URL, { waitUntil: 'domcontentloaded' });
await mp.waitForTimeout(3000);
const m1 = await read(mp);
if (m1.hasStore) ok('store present'); else fail('window.__store missing — did the app boot?');
if (m1.isDeviceMobile === true) ok('isDeviceMobile seeded true on a coarse-pointer 393px context');
else fail(`isDeviceMobile seeded ${m1.isDeviceMobile} on a coarse-pointer ${m1.innerWidth}px context`);
if (m1.isPortrait === true) ok('isPortrait seeded true'); else fail(`isPortrait seeded ${m1.isPortrait} at ${m1.innerWidth}×${m1.innerHeight}`);
if (m1.shellPos === 'sticky') ok('MobileViewportShell took the sticky (mobile) branch'); else fail(`shell position is ${m1.shellPos}, expected sticky`);
if (m1.shellPos === 'sticky' && Math.abs(px(m1.shellH) - m1.innerHeight) <= 2) ok(`shell fills the viewport (${m1.shellH} of ${m1.innerHeight}px)`);
else if (m1.shellPos === 'sticky') fail(`shell height ${m1.shellH} does not fill ${m1.innerHeight}px`);

console.log('\n[2] Pixel 5 rotated to 851×393');
await mp.setViewportSize({ width: 851, height: 393 });
await mp.waitForTimeout(600);
const m2 = await read(mp);
if (m2.isPortrait === false) ok('isPortrait flipped false on rotate (resize listener live)'); else fail(`isPortrait is ${m2.isPortrait} after rotating to 851×393`);
if (m2.isDeviceMobile === true) ok('still mobile after rotate (coarse pointer)'); else fail(`isDeviceMobile is ${m2.isDeviceMobile} after rotate`);
await mob.close();

console.log('\n[3] Desktop 1400×900');
const desk = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const dp = await desk.newPage();
await dp.goto(URL, { waitUntil: 'domcontentloaded' });
await dp.waitForTimeout(3000);
const d1 = await read(dp);
if (d1.isDeviceMobile === false) ok('desktop seeded isDeviceMobile=false'); else fail(`desktop seeded isDeviceMobile=${d1.isDeviceMobile} at ${d1.innerWidth}px (coarse=${d1.coarse})`);
if (d1.isPortrait === false) ok('desktop seeded isPortrait=false'); else fail(`desktop seeded isPortrait=${d1.isPortrait}`);
if (d1.shellPos === 'fixed') ok('MobileViewportShell took the fixed (desktop) branch'); else fail(`shell position is ${d1.shellPos}, expected fixed`);

console.log('\n[4] Desktop shrunk to 600×900');
await dp.setViewportSize({ width: 600, height: 900 });
await dp.waitForTimeout(600);
const d2 = await read(dp);
if (d2.isDeviceMobile === true) ok('isDeviceMobile flipped true below 768px'); else fail(`isDeviceMobile is ${d2.isDeviceMobile} at ${d2.innerWidth}px`);
if (d2.isPortrait === true) ok('isPortrait flipped true at 600×900'); else fail(`isPortrait is ${d2.isPortrait} at 600×900`);

console.log('\n[5] Desktop square 700×700');
await dp.setViewportSize({ width: 700, height: 700 });
await dp.waitForTimeout(600);
const d3 = await read(dp);
if (d3.isPortrait === false) ok('square counts as landscape'); else fail(`isPortrait is ${d3.isPortrait} on a square viewport`);
await desk.close();
await browser.close();

console.log(failures === 0 ? '\nPASS — mobile layout detection and shell branch hold' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
