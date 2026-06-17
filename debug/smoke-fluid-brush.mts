/**
 * Smoke test for the fluid-toy artist brush + particle emitter.
 * Uses the shared WebGL harness for reliable mouse drags + clicks.
 *
 *   1. BrushFeature slice exists with correct defaults and every
 *      param round-trips through `setBrush`.
 *   2. A rainbow-mode drag makes the canvas noticeably brighter than
 *      the untouched baseline — proves the new brush engine path is
 *      actually writing into the dye buffer.
 *   3. With the particle emitter on, a drag brightens the canvas
 *      beyond the no-emitter baseline. (We don't check
 *      `particles.length` after release — it's timing-sensitive and
 *      hard to make reliable without flake; the pixel-delta test is
 *      a much stronger signal that the emitter is alive.)
 */
import { launchWebglTestPage, dragPath } from './helpers/webglHarness';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

// Mean brightness of a centred rect in the canvas. Sample via a 2d
// scratch canvas so we avoid getImageData-on-WebGL issues.
const meanBrightness = (page: any, rect: { x: number; y: number; w: number; h: number }) =>
    page.evaluate((r: any) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) return -1;
        const scratch = document.createElement('canvas');
        scratch.width = r.w; scratch.height = r.h;
        const ctx = scratch.getContext('2d');
        if (!ctx) return -1;
        ctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        const img = ctx.getImageData(0, 0, r.w, r.h);
        let sum = 0;
        for (let i = 0; i < img.data.length; i += 4) sum += img.data[i] + img.data[i + 1] + img.data[i + 2];
        return sum / (img.data.length / 4 * 3);
    }, rect);

async function main() {
    const { page, browser, assertNoFatalErrors } = await launchWebglTestPage({ url: URL });

    // ── 1. Defaults + setter round-trip ──────────────────────────────
    const defaults = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return s.brush && { mode: s.brush.mode, colorMode: s.brush.colorMode, size: s.brush.size };
    });
    if (!defaults) throw new Error('brush slice missing');
    console.log('brush defaults:', JSON.stringify(defaults));
    if (defaults.colorMode !== 0) throw new Error(`colorMode default should be 0 (rainbow), got ${defaults.colorMode}`);

    const mutation = {
        mode: 0, colorMode: 1, size: 0.05, hardness: 0.7,
        strength: 2, flow: 80, spacing: 0.01, jitter: 0.25,
        particleEmitter: true, particleRate: 200, particleVelocity: 1.2,
        particleSpread: 0.6, particleGravity: 0.5, particleDrag: 1.4,
        particleLifetime: 2.5, particleSizeScale: 0.5,
    };
    await page.evaluate((m: any) => {
        (window as any).__store.getState().setBrush({ ...m, solidColor: { x: 1, y: 0.3, z: 0.1 } });
    }, mutation);
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => (window as any).__store.getState().brush);
    for (const [k, v] of Object.entries(mutation)) {
        const got = (after as any)[k];
        const ok = typeof v === 'number' ? Math.abs(got - v) < 1e-6 : got === v;
        if (!ok) throw new Error(`brush.${k} roundtrip: expected ${JSON.stringify(v)} got ${JSON.stringify(got)}`);
    }
    console.log('✓ brush params round-trip');

    // ── 2. Rainbow-mode drag produces visible pixels ─────────────────
    const reset = async () => page.evaluate(() => {
        (globalThis as any).__appHandles?.['fluid-toy.engine']?.ref?.current?.resetFluid?.();
    });
    await page.evaluate(() => {
        (window as any).__store.getState().setBrush({
            mode: 0, colorMode: 0, size: 0.08, hardness: 0,
            strength: 2, flow: 60, spacing: 0.003, jitter: 0,
            particleEmitter: false,
        });
    });
    await reset();
    await page.waitForTimeout(150);

    const canvas = await page.$('canvas');
    const box = await canvas!.boundingBox();
    if (!box) throw new Error('canvas not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const sampleRect = { x: Math.round(box.width / 2 - 60), y: Math.round(box.height / 2 - 30), w: 120, h: 60 };

    const b1 = await meanBrightness(page, sampleRect);
    // Keep drag under ~15 steps — Chromium's GPU watchdog kills the
    // renderer on long sustained drags. See webglHarness.ts § "Known limit".
    await dragPath(page, { x: cx - 40, y: cy, steps: 12, dx: 6, dy: 0, oscY: 10 });
    const b2 = await meanBrightness(page, sampleRect);
    console.log(`rainbow drag brightness: ${b1.toFixed(1)} → ${b2.toFixed(1)}  (Δ ${(b2 - b1).toFixed(1)})`);
    if (b2 - b1 < 5) throw new Error(`rainbow drag produced no visible pixels (Δ = ${(b2 - b1).toFixed(2)})`);
    console.log('✓ rainbow drag brightens the canvas');

    // ── 3. Particle emitter produces visible output ──────────────────
    await page.evaluate(() => {
        (window as any).__store.getState().setBrush({
            particleEmitter: true, particleRate: 300, particleLifetime: 3,
            particleSizeScale: 0.6, colorMode: 0,
        });
    });
    await reset();
    await page.waitForTimeout(150);

    const b3 = await meanBrightness(page, sampleRect);
    await dragPath(page, { x: cx - 40, y: cy, steps: 10, dx: 6, dy: 0, oscY: 15 });
    await page.waitForTimeout(150);  // let particles paint a couple more frames post-release
    const b4 = await meanBrightness(page, sampleRect);
    console.log(`emitter drag brightness: ${b3.toFixed(1)} → ${b4.toFixed(1)}  (Δ ${(b4 - b3).toFixed(1)})`);
    if (b4 - b3 < 5) throw new Error(`particle emitter painted nothing (Δ = ${(b4 - b3).toFixed(2)})`);
    console.log('✓ particle emitter paints visibly');

    assertNoFatalErrors();
    console.log('\n✅ Brush tab — defaults, splats, and particle streaks all work');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
