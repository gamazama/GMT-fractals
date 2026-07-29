/**
 * Smoke: setFps('match') remaps AudioClip.startFrame.
 *
 * Regression for `22_AUDIO_TIMELINE_SYNC_REPORT.md`. Before the fix,
 * audio clips stayed pinned to their old frame index across a wall-clock-
 * preserving fps change, so a clip placed against a keyframe would drift
 * by `(newFps/oldFps - 1) * startFrame` frames. After the fix, AudioClip
 * .startFrame scales with the same `r = newFps/oldFps` that already maps
 * keyframes.
 *
 * FIXTURE SHARPENED (2026-07-29 guard sweep). Every number in the original was
 * 120 and the only ratio was exactly 0.5, which cost it two things:
 *
 *  - The keyframe and the deck-0 clip sat at the SAME frame with the SAME
 *    expected result at every step, so nothing here could tell them apart. A
 *    remap that read the wrong array would have read the right number.
 *  - `remap`'s rounding was never load-bearing: 120 x 0.5 = 60 exactly, so
 *    `Math.round` -> `Math.floor` passed the whole smoke at exit 0. Measured.
 *
 * A deck-1 clip at frame 91 fixes both at once. It is distinct from every
 * keyframe in the fixture, and it is ODD, so 91 x 0.5 = 45.5 and the two
 * rounding modes disagree (46 against 45). Note it deliberately does NOT
 * round-trip: 46 x 2 = 92, not 91. That is real — half a frame is genuinely
 * lost on an odd index — which is why the round-trip case stays on the deck-0
 * clip at an even one. Falsified after adding: `Math.floor` -> exit 1 on four
 * assertions, where before it passed the whole file.
 *
 * RESIDUAL, measured and left deliberately: `Math.ceil` is still not separable
 * from `Math.round` here, and cannot be made so without adding a new fps ratio.
 * The only ratios this smoke uses are 0.5 and 2, and every odd frame times 0.5
 * lands on exactly x.5, where round and ceil agree — separating them needs a
 * product whose fraction falls in (0, 0.5), which 0.5 and 2 cannot produce from
 * an integer. Confirmed: `Math.ceil` passes at exit 0. A `ceil` slip is the
 * least likely of the three and costs at most one frame, so this is recorded
 * rather than chased.
 *
 * Deck 1 also widened the undo check: the FPS history entry has to snapshot the
 * WHOLE audioClips array, not slot 0. Falsified — snapshotting only index 0
 * gives "undo deck-1 startFrame expected 91, got null", exit 1.
 *
 * The two things this file exists for were already healthy, confirmed by
 * breaking them: dropping the audioClips remap -> exit 1 on the headline
 * assertion and on redo; dropping audioClips from the FPS undo entry -> exit 1
 * on undo.
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
        // Deck 1 at an ODD frame that matches no keyframe — see the header.
        anim.setAudioClip(1, {
            id: 'fps-remap-odd', deckIndex: 1,
            fileName: 'synthetic-odd.wav', durationSeconds: 10,
            startFrame: 91, trimStartSec: 0, trimEndSec: 10,
        });
        const s = (window as any).useAnimationStore.getState();
        return {
            fps: s.fps,
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
        };
    });

    if (seeded.fps !== 60 || seeded.keyFrame !== 120 || seeded.audioStartFrame !== 120
        || seeded.oddStartFrame !== 91) {
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
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
        };
    });

    const failures: string[] = [];
    if (after.fps !== 30)                  failures.push(`fps expected 30, got ${after.fps}`);
    if (after.keyFrame !== 60)             failures.push(`keyframe expected 60, got ${after.keyFrame}`);
    if (after.audioStartFrame !== 60)      failures.push(`audio startFrame expected 60, got ${after.audioStartFrame} — regression of 22_AUDIO_TIMELINE_SYNC_REPORT.md`);
    // 91 x 0.5 = 45.5. `Math.round` gives 46; `Math.floor` gives 45 and used to
    // pass this whole file, because the deck-0 clip at 120 cannot tell them apart.
    if (after.oddStartFrame !== 46)        failures.push(`odd-frame clip expected 46 (round(45.5)), got ${after.oddStartFrame} — remap is not rounding to nearest`);

    // Undo of a 'match' fps change must restore the audio clip too. The FPS
    // history entry remaps keyframes AND audioClips, so it has to snapshot
    // both — otherwise undo puts the keys back at frame 120 while the clip
    // stays at 60, which is exactly the `(r-1)*startFrame` drift this smoke
    // exists to catch, reintroduced via the undo path.
    const undone = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().undo();
        const s = (window as any).useAnimationStore.getState();
        return {
            fps: s.fps,
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
        };
    });
    if (undone.fps !== 60)             failures.push(`undo fps expected 60, got ${undone.fps}`);
    if (undone.keyFrame !== 120)       failures.push(`undo keyframe expected 120, got ${undone.keyFrame}`);
    if (undone.audioStartFrame !== 120) failures.push(`undo audio startFrame expected 120, got ${undone.audioStartFrame} — FPS history entry does not snapshot audioClips`);
    // Deck 1 as well: the snapshot has to carry the WHOLE array, not slot 0.
    if (undone.oddStartFrame !== 91)   failures.push(`undo deck-1 startFrame expected 91, got ${undone.oddStartFrame} — the FPS snapshot is not covering every deck`);

    // Redo must re-apply the remap to both.
    const redone = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().redo();
        const s = (window as any).useAnimationStore.getState();
        return {
            fps: s.fps,
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
        };
    });
    if (redone.fps !== 30)             failures.push(`redo fps expected 30, got ${redone.fps}`);
    if (redone.keyFrame !== 60)        failures.push(`redo keyframe expected 60, got ${redone.keyFrame}`);
    if (redone.audioStartFrame !== 60) failures.push(`redo audio startFrame expected 60, got ${redone.audioStartFrame}`);
    if (redone.oddStartFrame !== 46)   failures.push(`redo deck-1 startFrame expected 46, got ${redone.oddStartFrame}`);

    // Round-trip: setFps(60, 'match') must restore the original wall-clock placement.
    const restored = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().setFps(60, 'match');
        const s = (window as any).useAnimationStore.getState();
        return {
            keyFrame: s.sequence.tracks['julia.power'].keyframes[0].frame,
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
        };
    });
    if (restored.keyFrame !== 120)        failures.push(`round-trip keyframe expected 120, got ${restored.keyFrame}`);
    if (restored.audioStartFrame !== 120) failures.push(`round-trip audio startFrame expected 120, got ${restored.audioStartFrame}`);
    // 46 x 2 = 92, NOT 91 — an odd index really does lose half a frame on the way
    // down. Asserted at its true value rather than dropped, so a rounding change
    // shows up on the way back as well as on the way out.
    if (restored.oddStartFrame !== 92)    failures.push(`round-trip deck-1 startFrame expected 92, got ${restored.oddStartFrame}`);

    // 'keep' mode must leave audioClips alone — design contract.
    const keepCheck = await page.evaluate(() => {
        (window as any).useAnimationStore.getState().setFps(24, 'keep');
        const s = (window as any).useAnimationStore.getState();
        return {
            audioStartFrame: s.audioClips[0]?.startFrame ?? null,
            oddStartFrame: s.audioClips[1]?.startFrame ?? null,
            fps: s.fps,
        };
    });
    if (keepCheck.fps !== 24)                  failures.push(`keep-mode fps expected 24, got ${keepCheck.fps}`);
    if (keepCheck.audioStartFrame !== 120)     failures.push(`keep-mode audio startFrame must NOT remap (expected 120, got ${keepCheck.audioStartFrame})`);
    if (keepCheck.oddStartFrame !== 92)        failures.push(`keep-mode deck-1 startFrame must NOT remap (expected 92, got ${keepCheck.oddStartFrame})`);

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
