/**
 * Stage-1 orbit smoke — verifies `installNavigation()` + `<OrbitMode />`
 * works in the engine-gmt smoke harness.
 *
 * This rev also captures every console log during the drag so we can
 * read the absorb diagnostic emitted from OrbitMode.
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/engine-gmt-smoke.html';

const browser = await chromium.launch({
    args: ['--disable-gpu-sandbox', '--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

const errors: string[] = [];
const logs: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);

const beforeOffset = await page.evaluate(`(function() {
    const p = window.__gmtProxy;
    return p ? { x: p.sceneOffset.x, xL: p.sceneOffset.xL, y: p.sceneOffset.y, yL: p.sceneOffset.yL, z: p.sceneOffset.z, zL: p.sceneOffset.zL } : null;
})()`);
console.log('proxy.sceneOffset BEFORE drag:', JSON.stringify(beforeOffset));

await page.screenshot({ path: 'debug/orbit-before.png' });

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
for (const t of [500, 1500, 2500, 4000, 7000]) {
    await page.waitForTimeout(t === 500 ? 500 : t - (t === 1500 ? 500 : t === 2500 ? 1500 : t === 4000 ? 2500 : 4000));
    const o = await page.evaluate(`(function() {
        const p = window.__gmtProxy;
        return p ? 'x=' + p.sceneOffset.x + '+' + p.sceneOffset.xL.toFixed(3) + ' y=' + p.sceneOffset.y + '+' + p.sceneOffset.yL.toFixed(3) + ' z=' + p.sceneOffset.z + '+' + p.sceneOffset.zL.toFixed(3) : null;
    })()`);
    console.log('t=' + t + 'ms sceneOffset:', o);
    await page.screenshot({ path: 'debug/orbit-' + t + 'ms.png' });
}

const afterOffset = await page.evaluate(`(function() {
    const p = window.__gmtProxy;
    return p ? { x: p.sceneOffset.x, xL: p.sceneOffset.xL, y: p.sceneOffset.y, yL: p.sceneOffset.yL, z: p.sceneOffset.z, zL: p.sceneOffset.zL } : null;
})()`);
console.log('proxy.sceneOffset AFTER drag:', JSON.stringify(afterOffset));

const accum1 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`);
console.log('accumulationCount right after drag:', accum1);
await page.waitForTimeout(1500);
const accum2 = await page.evaluate(`window.__gmtProxy ? window.__gmtProxy.accumulationCount : null`);
console.log('accumulationCount 1.5s later:', accum2, '(advancing?', accum2 !== accum1, ')');

const cam = await page.evaluate(`(function() {
    const c = window.__r3fCamera;
    if (!c) return 'no camera on window';
    return (
        'pos=' + c.position.x.toFixed(3) + ',' + c.position.y.toFixed(3) + ',' + c.position.z.toFixed(3) +
        ' quat=' + c.quaternion.x.toFixed(3) + ',' + c.quaternion.y.toFixed(3) + ',' + c.quaternion.z.toFixed(3) + ',' + c.quaternion.w.toFixed(3) +
        ' fov=' + c.fov
    );
})()`);
console.log('R3F camera AFTER drag:', cam);

const tgt = await page.evaluate(`(function() {
    const t = window.__getOrbitTarget && window.__getOrbitTarget();
    if (!t) return 'no target';
    return 'target=' + t.x.toFixed(3) + ',' + t.y.toFixed(3) + ',' + t.z.toFixed(3);
})()`);
console.log('orbit target AFTER drag:', tgt);

await page.screenshot({ path: 'debug/orbit-after.png' });

console.log('\n--- console logs (last 25) ---');
logs.slice(-25).forEach((l) => console.log(l));

console.log('\nerrors:', errors.length);
errors.forEach((e) => console.log('  ', e));

await browser.close();
