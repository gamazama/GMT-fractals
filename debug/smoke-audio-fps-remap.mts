/**
 * Smoke: setFps('match') remaps AudioClip.startFrame.
 *
 * Regression for `22_AUDIO_TIMELINE_SYNC_REPORT.md`. Before the fix,
 * audio clips stayed pinned to their old frame index across a wall-clock-
 * preserving fps change, so a clip placed against a keyframe would drift
 * by `(newFps/oldFps - 1) * startFrame` frames. After the fix, AudioClip
 * .startFrame scales with the same `r = newFps/oldFps` that already maps
 * keyframes.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Seed: fps=60, clip at startFrame=120 (= 2.0 s wall) and a keyframe
    // at frame 120 on a fresh track (also 2.0 s wall). Same wall-clock
    // position is the alignment that must survive setFps('match').
    const seeded = await page.evaluate(() => {
        const anim = (window as any).useAnimationStore.getState();
        anim.setFps(60, 'keep'); // normalise the starting fps
        anim.addTrack('julia.power', 'Julia Power');
        anim.addKeyframe('julia.power', 120, 2);
        anim.setAudioClip(0, {
            id: 'fps-remap-test', deckIndex: 0,
            fileName: 'synthetic.wav', durationSeconds: 10,
            startFrame: 120, trimStartSec: 0, trimEndSec: 10,
        });
        const s = (window as any).useAnimationStore.getState();
        return {
            fps: s.fps,
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
        };
    });

    if (seeded.fps !== 60 || seeded.keyFrame !== 120 || seeded.audioStartFrame !== 120) {
        console.error('Seed failed:', seeded);
        process.exit(1);
    }

    // Switch to fps=30 'match' — wall-clock-preserving. Keys and audio
    // both scale by r = 30/60 = 0.5, so frame 120 → frame 60 on each.
    const after = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().setFps(30, 'match');
        const s = (window as any).useAnimationStore.getState();
        return {
            fps: s.fps,
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
        };
    });

    const failures: string[] = [];
    if (after.fps !== 30)                  failures.push(`fps expected 30, got ${after.fps}`);
    if (after.keyFrame !== 60)             failures.push(`keyframe expected 60, got ${after.keyFrame}`);
    if (after.audioStartFrame !== 60)      failures.push(`audio startFrame expected 60, got ${after.audioStartFrame} — regression of 22_AUDIO_TIMELINE_SYNC_REPORT.md`);

    // Round-trip: setFps(60, 'match') must restore the original wall-clock placement.
    const restored = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().setFps(60, 'match');
        const s = (window as any).useAnimationStore.getState();
        return {
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
        };
    });
    if (restored.keyFrame !== 120)        failures.push(`round-trip keyframe expected 120, got ${restored.keyFrame}`);
    if (restored.audioStartFrame !== 120) failures.push(`round-trip audio startFrame expected 120, got ${restored.audioStartFrame}`);

    // 'keep' mode must leave audioClips alone — design contract.
    const keepCheck = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().setFps(24, 'keep');
        const s = (window as any).useAnimationStore.getState();
        return { audioStartFrame: s.audioClips[0]?.startFrame ?? null, fps: s.fps };
    });
    if (keepCheck.fps !== 24)                  failures.push(`keep-mode fps expected 24, got ${keepCheck.fps}`);
    if (keepCheck.audioStartFrame !== 120)     failures.push(`keep-mode audio startFrame must NOT remap (expected 120, got ${keepCheck.audioStartFrame})`);

    await browser.close();

    if (errors.length) {
        console.error('Page errors:', errors);
        process.exit(1);
    }
    if (failures.length) {
        for (const f of failures) console.error('FAIL:', f);
        process.exit(1);
    }
    console.log('audio fps remap: PASS');
}

main().catch(err => { console.error(err); process.exit(1); });
