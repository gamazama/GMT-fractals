/**
 * Smoke test: with collision walls enabled, particles reflect off them
 * instead of passing through.
 *
 * Strategy:
 *   1. Configure a collision gradient that produces a solid wall across
 *      the middle of the canvas (centre band in t-space, stepped).
 *   2. Spawn particles at a known location with velocity pointing at
 *      the wall. Step a few frames.
 *   3. Assert that no particle penetrated past the wall, that none ended
 *      inside the wall mask, and that the bounce shed speed.
 *
 * ⚠ **Until 2026-07-29 this smoke passed 5 runs out of 6 with the wall-bounce
 * path completely disabled** (`if (false && ...)` on the WALL_THRESHOLD branch
 * in fluid-toy/brush/particles.ts). Two causes, both measured:
 *
 *   - `slowed` was measuring DRAG, not bouncing. particleDrag defaults to 0.6/s
 *     and the settle window is 1200 ms, so exp(-0.72) ≈ 0.49 of the speed is
 *     gone before the wall is involved at all. Measured final/initial ratios:
 *     healthy 0.35-0.51, bounce disabled 0.58-0.66. Both sit under the 0.75
 *     bar, so the counter reads 16/16 either way and cannot separate them.
 *   - `insideWall` only fires if particles happen to still be inside the band
 *     at the capture instant. With no bounce they sail straight through and out
 *     the far side within the window; it caught that in 1 run of 6.
 *
 * The discriminating quantity is PENETRATION — how far past the spawn point,
 * along the incoming direction, the deepest particle got. Measured over 5+5
 * runs with no overlap: healthy 0.0023-0.0041, bounce disabled 0.0971-0.1144,
 * against a spawn-to-wall gap of 0.0300. That is what the new assertion uses,
 * and it is scaled by the measured gap rather than a tuned constant.
 *
 * A second, quieter bug: `initial` was snapshotted in a separate page.evaluate
 * AFTER the injecting one, so the RAF loop had already dragged the particles
 * and the "initial" speed read 0.086-0.114 instead of the injected 0.15,
 * varying run to run. It is now captured inside the inject call.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Enable collision + install a stepped mid-band wall gradient.
    await page.evaluate(() => {
        const s = (window as any).__store.getState();
        s.setCollision({
            enabled: true,
            repeat: 1,
            phase: 0,
            gradient: {
                colorSpace: 'srgb',
                blendSpace: 'rgb',
                // 50%-wide solid band so the wall is fat enough for a
                // 128-cell downsampled mask to give a clean gradient
                // normal on both sides.
                stops: [
                    { id: 'c0', position: 0.00, color: '#000000', bias: 0.5, interpolation: 'step' },
                    { id: 'c1', position: 0.25, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                    { id: 'c2', position: 0.75, color: '#000000', bias: 0.5, interpolation: 'step' },
                    { id: 'c3', position: 1.00, color: '#000000', bias: 0.5, interpolation: 'step' },
                ],
            },
        });
        // Keep the julia default colour mapping so the mask has a clean
        // iteration-vs-t relationship.
    });
    // Let several frames land so computeMask + readMaskToCPU populate.
    await page.waitForTimeout(500);

    // Sanity: is sampleMask returning non-zero somewhere?
    const maskMax = await page.evaluate(() => {
        const engine = (globalThis as any).__appHandles?.['fluid-toy.engine']?.ref?.current;
        if (!engine) return -1;
        let m = 0;
        for (let y = 0; y < 1; y += 0.05) for (let x = 0; x < 1; x += 0.05) {
            m = Math.max(m, engine.sampleMask(x, y));
        }
        return m;
    });
    console.log(`max sampled mask value: ${maskMax.toFixed(3)}`);
    if (maskMax < 0.3) {
        throw new Error(`mask appears empty on CPU (max=${maskMax}) — readback isn't populating`);
    }

    // Find a UV point where the mask is solid and a neighbouring UV
    // point where it's open, so we can inject test particles at the
    // open point aimed at the wall.
    const anchor = await page.evaluate(() => {
        const engine = (globalThis as any).__appHandles?.['fluid-toy.engine']?.ref?.current;
        let wallPt: [number, number] | null = null;
        let freePt: [number, number] | null = null;
        for (let y = 0.1; y < 0.9 && !wallPt; y += 0.04) {
            for (let x = 0.1; x < 0.9 && !wallPt; x += 0.04) {
                if (engine.sampleMask(x, y) > 0.8) wallPt = [x, y];
            }
        }
        if (!wallPt) return null;
        // Scan outward from wallPt to find an open cell.
        for (let r = 0.03; r < 0.5 && !freePt; r += 0.02) {
            for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
                const x = wallPt![0] + dx, y = wallPt![1] + dy;
                if (x < 0 || x > 1 || y < 0 || y > 1) continue;
                if (engine.sampleMask(x, y) < 0.1) { freePt = [x, y]; break; }
            }
        }
        return wallPt && freePt ? { wall: wallPt, free: freePt } : null;
    });
    if (!anchor) throw new Error('could not find a wall/free pair in the mask');
    console.log(`wall at ${anchor.wall.map((n: number) => n.toFixed(3))}, free at ${anchor.free.map((n: number) => n.toFixed(3))}`);

    // Inject test particles directly into the runtime, aimed at the wall, and
    // return the injected velocities in the SAME evaluate. Snapshotting them in
    // a second round-trip let the RAF loop drag them first, so the "initial"
    // speed read 0.086-0.114 instead of 0.15 and drifted run to run.
    const initial = await page.evaluate(({ free, wall }: any) => {
        const rt = (globalThis as any).__appHandles?.['fluid-toy.brush']?.ref?.current?.runtime;
        rt.particles.length = 0;
        const dx = wall[0] - free[0];
        const dy = wall[1] - free[1];
        const len = Math.hypot(dx, dy);
        // Speed = 0.15 UV/sec — deliberately slow so particles don't
        // tunnel through narrow walls in one step. Real particles ride
        // at ~0.3 UV/sec with drag, so this is the conservative edge.
        const speed = 0.15;
        // 16 particles (not 8) so at least one clears the 75%-slowdown bar
        // even when the chain-load RAF steps fewer frames in the window.
        for (let i = 0; i < 16; i++) {
            rt.particles.push({
                x: free[0] + (Math.random() - 0.5) * 0.01,
                y: free[1] + (Math.random() - 0.5) * 0.01,
                vx: (dx / len) * speed,
                vy: (dy / len) * speed,
                life: 5, lifeMax: 5,
                color: [1, 1, 1],
                size: 0.02,
            });
        }
        return rt.particles.map((p: any) => ({ vx: p.vx, vy: p.vy }));
    }, anchor);

    // Let the sim run — the RAF loop in FluidToyApp steps particles every
    // frame and calls stepBrush → stepParticles → bounce. 1200ms gives the
    // particles enough frames to reach + reflect off the wall even under
    // chain load (where RAF cadence drops).
    await page.waitForTimeout(1200);

    // Check outcome.
    const final = await page.evaluate(() => {
        const engine = (globalThis as any).__appHandles?.['fluid-toy.engine']?.ref?.current;
        const rt = (globalThis as any).__appHandles?.['fluid-toy.brush']?.ref?.current?.runtime;
        return rt.particles.map((p: any) => ({
            x: p.x, y: p.y,
            vx: p.vx, vy: p.vy,
            maskAtPos: engine.sampleMask(p.x, p.y),
        }));
    });

    console.log(`initial particles: ${initial.length}`);
    console.log(`surviving particles: ${final.length}`);

    // Julia iso-curves are rarely axis-aligned, so wall normals are
    // typically oblique → reflect reduces velocity magnitude without
    // strictly flipping sign. Two relaxed criteria that both hold only
    // when bouncing actually happens:
    //   - speed decreased noticeably (reflect + restitution)
    //   - no particle ended up INSIDE a wall (they got pushed out)
    let slowed = 0;
    let insideWall = 0;
    for (let i = 0; i < final.length; i++) {
        const initSpeed = Math.hypot(initial[i].vx, initial[i].vy);
        const finSpeed  = Math.hypot(final[i].vx,   final[i].vy);
        if (finSpeed < initSpeed * 0.75) slowed++;
        if (final[i].maskAtPos > 0.5) insideWall++;
    }
    const meanInit = initial.reduce((s: number, p: any) => s + Math.hypot(p.vx, p.vy), 0) / initial.length;
    const meanFin = final.reduce((s: number, p: any) => s + Math.hypot(p.vx, p.vy), 0) / final.length;
    // ── Penetration: the assertion that actually discriminates ───────
    // How far past the spawn point, along the spawn→wall direction, did the
    // deepest particle get? Bounced particles are turned around before they
    // close the gap; unbounced ones sail through it. Bound is the MEASURED gap
    // (x1.5, to absorb the ND = 0.01 normal-out nudge in stepParticles), not a
    // tuned constant — it rescales with whatever wall/free pair the anchor
    // search found. Measured over 5+5 runs, no overlap: healthy 0.0023-0.0041,
    // bounce path disabled 0.0971-0.1144, gap 0.0300.
    const gapX = anchor.wall[0] - anchor.free[0];
    const gapY = anchor.wall[1] - anchor.free[1];
    const gap = Math.hypot(gapX, gapY);
    const dirX = gapX / gap, dirY = gapY / gap;
    const penetration = final.map((p: any) => (p.x - anchor.free[0]) * dirX + (p.y - anchor.free[1]) * dirY);
    const maxPenetration = Math.max(...penetration);
    const maxPenetrationAllowed = gap * 1.5;
    console.log(`speed: mean ${meanInit.toFixed(4)} → ${meanFin.toFixed(4)} (ratio ${(meanFin / meanInit).toFixed(3)})`);
    console.log(`penetration: max ${maxPenetration.toFixed(4)} of an allowed ${maxPenetrationAllowed.toFixed(4)} (gap ${gap.toFixed(4)})`);
    // `slowed` measures DRAG as much as restitution — see the header. Kept
    // because a total stop or a runaway would still show up here, but it does
    // NOT prove the bounce fired; the penetration bound above is what does.
    console.log(`slowed (speed < 75% of initial): ${slowed}/${final.length}`);
    console.log(`ended inside wall:                 ${insideWall}/${final.length}`);

    if (maxPenetration > maxPenetrationAllowed) {
        throw new Error(
            `a particle got ${maxPenetration.toFixed(4)} past the spawn point toward the wall, past the allowed ` +
            `${maxPenetrationAllowed.toFixed(4)} (1.5x the measured ${gap.toFixed(4)} gap) — the wall did not stop it, ` +
            `so the bounce path never fired. Note the 'slowed' counter below cannot see this: particleDrag alone ` +
            `takes the speed ratio under 0.75 within the settle window.`,
        );
    }
    if (slowed === 0) {
        throw new Error('no particles slowed — bounce path never fired');
    }
    if (insideWall > 0) {
        throw new Error(`${insideWall}/${final.length} particles stuck inside the wall — bounce isn't pushing them out`);
    }

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b|WebGL/.test(e));
        if (fatal.length > 0) throw new Error('page errors:\n  ' + errors.join('\n  '));
    }

    console.log('\n✅ Particle bounce works — velocities reverse when hitting the mask');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
