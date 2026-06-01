/**
 * Orbit smoke — verifies that a left-drag in app-gmt orbits the scene
 * (installNavigation() + <OrbitMode />) and that the engine keeps
 * accumulating afterwards.
 *
 * Asserts against `window.__gmtProxy` (the engine→worker shadow proxy):
 *   1. an orbit drag changes `sceneOffset` (hi+lo combined) — the view
 *      actually moved, not a no-op;
 *   2. `accumulationCount` advances after the interaction settles — the
 *      path-traced accumulation resumed rather than stalling.
 *
 * (The old rev read `window.__r3fCamera` / `__getOrbitTarget`, which never
 * existed on window — those reads are gone.)
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

async function main() {
    const browser = await chromium.launch({
        args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);

    const readOffset = () => page.evaluate(`(function() {
        const p = window.__gmtProxy;
        if (!p) return null;
        const o = p.sceneOffset;
        return { x: o.x + o.xL, y: o.y + o.yL, z: o.z + o.zL };
    })()`) as Promise<{ x: number; y: number; z: number } | null>;

    const before = await readOffset();
    console.log('sceneOffset BEFORE drag:', JSON.stringify(before));
    if (!before) throw new Error('window.__gmtProxy not present — engine shadow proxy missing');

    // Orbit drag: press near centre, sweep right + down.
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport');
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    await page.mouse.move(cx - 150, cy);
    await page.mouse.down({ button: 'left' });
    for (let i = 1; i <= 12; i++) {
        await page.mouse.move(cx - 150 + i * 25, cy + i * 8, { steps: 1 });
        await page.waitForTimeout(30);
    }
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(500);

    const after = await readOffset();
    console.log('sceneOffset AFTER drag: ', JSON.stringify(after));
    if (!after) throw new Error('window.__gmtProxy disappeared after drag');

    const delta = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
    console.log(`sceneOffset delta: ${delta.toFixed(3)}`);
    if (delta < 0.5) {
        throw new Error(`orbit drag did not move the scene — sceneOffset delta ${delta.toFixed(3)} < 0.5`);
    }

    // The orbit interaction resets the path-trace accumulation; confirm the
    // render loop resumes by polling for the count to climb. Accumulation is
    // slow right after an interaction (a few frames/sec), so poll up to 8s
    // rather than racing a fixed window.
    const accum1 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`) as number | null;
    if (typeof accum1 !== 'number') {
        throw new Error(`accumulationCount unavailable on __gmtProxy (${accum1})`);
    }
    const advanced = await page.waitForFunction(
        (a0) => {
            const p = (window as any).__gmtProxy;
            return !!p && typeof p.accumulationCount === 'number' && p.accumulationCount > a0;
        },
        accum1,
        { timeout: 8000, polling: 250 },
    ).then(() => true).catch(() => false);
    const accum2 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`) as number | null;
    console.log(`accumulationCount: ${accum1} → ${accum2} (advanced within 8s: ${advanced})`);
    if (!advanced) {
        throw new Error(`accumulation did not advance after orbit settled (${accum1} → ${accum2}) — render loop stalled?`);
    }

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b/.test(e));
        if (fatal.length > 0) throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ orbit drag moves sceneOffset and accumulation resumes');
    console.log(`  sceneOffset delta ${delta.toFixed(2)}, accumulation ${accum1} → ${accum2}`);
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
