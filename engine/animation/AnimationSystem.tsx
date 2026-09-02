/**
 * AnimationSystem — modulation tick dispatcher.
 *
 * Ex-`legacy-gmt/AnimationSystem.tsx`. The tick drives, in order:
 * keyframe playback (`animationEngine.tick`), audio-clip deck sync,
 * oscillators + modulation rules (`modulationEngine`), then one pass over
 * every modulated target.
 *
 * @assumption Neither branch SELECTION nor branch BODIES live here. Every
 *   target is classified by `classifyModulationTarget`
 *   (engine/features/modulation/targetRouting.ts) and executed by
 *   `planModulationTarget` (engine/features/modulation/applyTarget.ts) — the
 *   same pure dispatcher the render-export path runs, so a render cannot
 *   silently disagree with the preview (ADR-0109). Those two modules are what
 *   `debug/test-modulation-coverage.mts` and `test-modulation-parity.mts`
 *   grade. Adding or changing a branch means teaching the resolver and the
 *   dispatcher; nothing in this file is a source of truth about routing.
 *
 * What IS this file's own: the live-tick bookkeeping a pure plan cannot do —
 * emitting `plan.uniforms` through `FRACTAL_EVENTS.UNIFORM`, tracking uniform
 * ownership, publishing `liveModulations`, capturing `plan.records` as
 * keyframes while modulation-recording (with the audio back-fill sub-pass),
 * and the accumulation-reset diff.
 *
 * The GMT-specific slice knowledge (coloring / julia / geometry rotation /
 * lighting) that used to be inlined here now sits behind those slice-gated
 * branches in `applyTarget.ts`; apps without those slices fall through to the
 * generic scalar / vecAxis path untouched.
 */

import React from 'react';
import { animationEngine } from '../AnimationEngine';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { getProxy } from '../worker/WorkerProxy';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';

// Resolved PER TICK, never captured at module scope.
//
// @assumption `getProxy()` returns the lazily-created stub until the host app
//   calls `setProxy()` (engine-gmt does it in `installGmtRenderer`). A
//   module-scope capture races that install: whichever module evaluates first
//   wins, and if this one did, every `engine.modulations` write below landed on
//   an orphaned stub while the real proxy shipped its own empty dict — the
//   rotation / camera / lighting offsets would be built correctly each frame
//   and then dropped. Resolving inside the tick makes the capture order
//   irrelevant. @see docs/adr/0107-live-modulation-transport.md

// Uniform writes flow through FRACTAL_EVENTS.UNIFORM so apps that have
// installed a real worker-proxy bridge (engine-gmt via
// GmtRendererTickDriver) receive them. Engine-core's WorkerProxy
// is a stub — calling engine.setUniform directly would be a no-op and
// the modulated uniform never reaches the render pipeline.
// Names collected per tick and handed to modulationEngine, which forwards them
// to the worker so `syncConfigUniforms` doesn't overwrite them from the raw base
// config between ticks. See ModulationEngine.setOwnedUniforms.
const ownedUniforms = new Set<string>();
const emitUniform = (key: string, value: unknown, noAccumReset = false) => {
    ownedUniforms.add(key);
    FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, { key, value, noAccumReset });
};
const emitResetAccum = () => {
    FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
};

import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { syncAudioClips } from './audioClipSync';
import { modulationEngine } from '../features/modulation/ModulationEngine';
import { classifyModulationTarget } from '../features/modulation/targetRouting';
import { planModulationTarget, flushModulationComposites, newCompositeAccumulator } from '../features/modulation/applyTarget';
import { AudioState } from '../features/audioMod';
import { ModulationState } from '../features/modulation';

// Global refs for animation system state
const activeTargetsRef = { current: new Set<string>() };
// Previous frame's modulation offsets — compared each tick so accumulation
// resets only when the modulated OUTPUT actually changed, not whenever an
// offset is merely non-zero (a constant or slow LFO otherwise reset every
// frame, so the path tracer never converged).
const prevOffsets = { current: {} as Record<string, number> };
const lastFrameRecorded = { current: -1 };
const initialStaticValues = { current: {} as Record<string, number> };
// Tracks isRecordingModulation across ticks so the per-tick driver
// can run the on-start / on-stop transitions itself instead of
// relying on a React useEffect (the legacy AnimationSystem component
// only mounts in <ViewportArea>; app-gmt uses ViewportFrame and
// therefore never fires that effect — leaving overriddenTracks set
// after recording stopped, which silently broke timeline playback
// for any track that was being modulated during the recording).
const prevIsRec = { current: false };
const EMPTY_OVERRIDES: Set<string> = new Set();

// Modulation recording flushes its keyframe writes to the store at this
// interval rather than once per tick. Each store update re-renders the whole
// timeline keyframe tree (DopeSheet → TrackRow → KeyframeDiamond × N), and
// per-tick writes make that cost grow linearly with recorded length —
// recording slows down to a crawl after a couple hundred frames. Flushing in
// chunks cuts re-renders to ~6/sec without changing the keyframe data.
const RECORD_FLUSH_MS = 400;
const recordBuffer: { startFrame: number, endFrame: number, updates: { trackId: string, value: number }[] }[] = [];
let lastRecordFlushMs = 0;

function flushRecordBuffer() {
    if (recordBuffer.length === 0) return;
    useAnimationStore.getState().batchAddKeyframesMultiRange(recordBuffer, 'Linear');
    recordBuffer.length = 0;
}

/**
 * @assumption Cleanup pass blocks the early-return: while
 *   `activeTargetsRef.current.size > 0` the tick still runs one pass to
 *   clear the previous frame's stale uniforms and emit baselines.
 * @assumption Uniforms flow via `FractalEvents.emit(FRACTAL_EVENTS.UNIFORM,
 *   …)` NOT `engine.setUniform` — engine-core's WorkerProxy is a stub;
 *   only hosts with a real bridge receive them.
 */
// Exported tick function for orchestrator pattern
// ── Live modulation publish ──────────────────────────────────────────────
// The tick resolves every modulated target's absolute value each frame. Two
// consumers want it at two different rates: the RENDER path (the host's tick
// driver merging optics etc. into renderState) needs this frame's values, so
// it reads `getLiveModulationsNow()`; the UI (purple slider indicators, and
// every whole-store subscriber such as the panel router) only needs ~20 Hz,
// and re-rendering every open panel 60×/s while audio modulates anything was
// a real main-thread and repaint cost next to the render loop. Hosts opt into
// the throttle with `setLiveModulationPublishInterval(ms)`; the default (0)
// keeps the historical publish-on-every-change behaviour, so fluid-toy and
// the demo, whose sim reads the store map per frame, are unchanged.
let _latestLiveModulations: Record<string, number> = {};
let _publishIntervalMs = 0;
let _lastPublishMs = 0;
/** This frame's resolved live-modulation map (base + offsets per target).
 *  Always current; unlike the store copy it is never throttled. */
export const getLiveModulationsNow = (): Record<string, number> => _latestLiveModulations;
/** Minimum spacing between store publishes of `liveModulations`, in ms.
 *  0 = publish on every change (default). A target appearing or vanishing
 *  always publishes immediately so indicators never lag on structure. */
export const setLiveModulationPublishInterval = (ms: number): void => { _publishIntervalMs = Math.max(0, ms); };

export const tick = (delta: number) => {
    const engine = getProxy();
    const animStore = useAnimationStore.getState();
    const storeState = useEngineStore.getState();

    // Recording-on/off transitions. Used to live in the React component
    // <AnimationSystem />'s useEffect, but app-gmt never mounts that
    // component, so the cleanup never ran and overriddenTracks stayed
    // populated after recording — blocking the timeline from driving
    // the recorded params on playback. Run from the tick instead so
    // the lifecycle is self-contained.
    const isRecNow = animStore.isRecordingModulation;
    if (isRecNow !== prevIsRec.current) {
        if (isRecNow) {
            initialStaticValues.current = {};
            lastFrameRecorded.current = -1;
            recordBuffer.length = 0;
            lastRecordFlushMs = performance.now();
        } else {
            // Recording just stopped — flush any pending writes, then clear
            // overrides so AnimationEngine.scrub stops skipping the recorded
            // tracks during playback.
            flushRecordBuffer();
            animationEngine.setOverriddenTracks(EMPTY_OVERRIDES);
        }
        prevIsRec.current = isRecNow;
    }

    // OPTIMIZATION: Skip animation if nothing is animated or oscillating
    const trackCount = Object.keys(animStore.sequence.tracks).length;
    const hasAnimations = trackCount > 0;
    const lfosEnabled = storeState.lfosEnabled;
    // hasOscillators gates the early-return guard below — when the LFO
    // master is off a scene with N LFOs should still skip the per-frame
    // work, since none of them contribute offsets.
    const hasOscillators = storeState.animations.length > 0 && lfosEnabled;
    const hasModulationRules = (storeState as any).modulation?.rules?.length > 0;
    const isAudioEnabled = (storeState as any).audio?.isEnabled ?? false;
    const hasAudioClips = ((animStore as any).audioClips as (unknown | null)[] | undefined)?.some(c => !!c) ?? false;

    // The cleanup branch below relies on `activeTargetsRef.current` to know
    // which targets were modulated last frame so it can emit a baseline
    // uniform write + clear liveModulations on removal. When the user
    // deletes the last LFO, hasOscillators flips to false and an early
    // return here would skip that flush — leaving the uniform stuck at
    // its final modulated value and liveModulations stale forever. Stay
    // through one more pass when prev-frame targets remain, then on the
    // tick after that everything legitimately is empty and we early-out.
    if (
        !hasAnimations && !hasOscillators && !hasModulationRules && !isAudioEnabled && !hasAudioClips
        && activeTargetsRef.current.size === 0
    ) {
        return; // Skip all animation processing
    }
    
    // 1. Tick Animation Timeline (Keyframes)
    animationEngine.tick(delta);

    const modulationSlice = (storeState as any).modulation as ModulationState;
    const audioSlice = (storeState as any).audio as AudioState;
    
    // 2. Audio analysis has moved to its own tick — `engine/animation/audioTick`,
    //    registered at SNAPSHOT so `filterBank` is filled before the dispatch
    //    below reads it. It used to live here, which meant only apps using this
    //    dispatcher ever analysed audio. @see docs/adr/0110-*.md

    // 2b. Sync each audio clip's deck playback to the timeline frame.
    const audioClips = (animStore as { audioClips?: (import('../../store/animation/types').AudioClip | null)[] }).audioClips;
    if (audioClips && audioClips.some(c => c)) {
        syncAudioClips(audioClips, animStore.currentFrame, animStore.fps, animStore.isPlaying);
    }

    // 3. Reset Engine Buffer
    modulationEngine.resetOffsets();
    engine.modulations = {}; // Reset engine buffer
    // Rebuilt from scratch each tick: a target that stops being modulated must
    // drop out of the skip list, or its uniform would stay frozen at the last
    // modulated value (config sync could never correct it back to base).
    ownedUniforms.clear();

    // Recording Check
    const currentFrame = Math.floor(animStore.currentFrame);
    // We use the ref version of isRecordingModulation to avoid effect re-runs,
    // but we must read fresh from store inside loop or use the ref passed from prop/store
    const isRec = useAnimationStore.getState().isRecordingModulation;
    const shouldRecord = isRec && currentFrame > lastFrameRecorded.current;
    // First gap frame to back-fill so slow renders don't leave holes between
    // FFT samples — captures the same FFT for every integer frame between the
    // last recorded one and now. lastFrameRecorded starts at -1 on arm, so the
    // first record on a fresh session writes from frame 0 through currentFrame.
    const recordingStartFrame = shouldRecord ? lastFrameRecorded.current + 1 : currentFrame;

    if (shouldRecord) lastFrameRecorded.current = currentFrame;

    // 4. Update Oscillators
    //    Deterministic playback phases the oscillators by `currentFrame /
    //    fps` instead of `performance.now() / 1000`, so an LFO that's at
    //    phase 0.5 in the export is at phase 0.5 in the live preview too.
    const animations = storeState.animations;
    const deterministic = (animStore as { deterministicPlayback?: boolean }).deterministicPlayback;
    const oscTime = deterministic && animStore.isPlaying
        ? animStore.currentFrame / Math.max(1, animStore.fps)
        : performance.now() / 1000;
    const oscDt = deterministic && animStore.isPlaying
        ? 1 / Math.max(1, animStore.fps)
        : delta;
    // 4b. PER-FRAME BACK-FILL, before the live pass.
    //
    // When the tick runs slower than the timeline advances, the frames in
    // between still need keyframes. The original behaviour repeated ONE value
    // across the whole gap — complete, but flat: under the 1Hz tick throttle a
    // whole second of automation became a single step.
    //
    // The worklet analysed those moments for real (ADR-0110), so the ring can
    // give each frame its own bands. Re-running the rule pipeline per frame is
    // more than interpolation — envelopes, thresholds and flux step as they
    // would have if the tick had actually run there.
    //
    // @assumption Runs BEFORE step 4/5, never after. `combinedOffsets` below is
    //   a live REFERENCE to `modulationEngine.offsets`, so a sub-pass running
    //   afterwards would mutate the object the live pass had already read and
    //   leave `currentTargets` describing a different frame's targets.
    // @assumption Sub-frames take ONLY `plan.records`. Uniforms, engine
    //   modulations and liveModulations belong to the present — emitting a past
    //   frame's uniform would flicker the viewport backwards through the gap.
    //   The plan is a description; the caller chooses what to execute.
    // @assumption A frame the ring cannot cover is SKIPPED, not guessed — it
    //   falls back to the repeat below. A wrong value dressed as a measurement
    //   is worse than an honest repeat. Misses cluster at the oldest end, so
    //   what survives is a suffix; `backfillFrom` is where it starts.
    // @assumption Entries are staged, not pushed, and emitted in ASCENDING frame
    //   order after the live pass. `batchAddKeyframesMultiRange` has a fast
    //   path only while frames increase — writing the gap after `currentFrame`
    //   would send every back-filled frame down a filter+sort path its own
    //   comment calls cold.
    const backfill: { startFrame: number, endFrame: number, updates: { trackId: string, value: number }[] }[] = [];
    let backfillFrom = currentFrame;
    if (shouldRecord && currentFrame > recordingStartFrame
        && isAudioEnabled && modulationSlice?.rules?.length) {
        const fps = Math.max(1, animStore.fps);
        const subDt = 1 / fps;
        const nowT = audioAnalysisEngine.contextTime;
        for (let f = recordingStartFrame; f < currentFrame; f++) {
            const ageSec = (currentFrame - f) / fps;
            if (!audioAnalysisEngine.applySnapshotAt(nowT - ageSec, subDt)) continue;

            modulationEngine.resetOffsets();
            modulationEngine.update(modulationSlice.rules, subDt, isAudioEnabled, lfosEnabled);

            const subComposites = newCompositeAccumulator();
            const subRecords: { trackId: string, value: number }[] = [];
            for (const targetKey of Object.keys(modulationEngine.offsets)) {
                const routing = classifyModulationTarget(
                    targetKey, storeState as unknown as Record<string, unknown>);
                const plan = planModulationTarget(
                    targetKey, modulationEngine.offsets[targetKey] ?? 0,
                    storeState as unknown as Record<string, any>, routing, subComposites,
                    { isRemoved: false },
                );
                for (const r of plan.records) subRecords.push(r);
            }
            if (subRecords.length > 0) {
                if (f < backfillFrom) backfillFrom = f;
                backfill.push({ startFrame: f, endFrame: f, updates: subRecords });
            }
        }
        // Return the bank to the present before the live pass reads it.
        audioAnalysisEngine.applySnapshotAt(nowT, Number.POSITIVE_INFINITY);
        modulationEngine.resetOffsets();
    }

    modulationEngine.updateOscillators(animations, oscTime, oscDt, lfosEnabled);

    // 5. Process Modulation Rules
    if (modulationSlice && modulationSlice.rules) {
         modulationEngine.update(modulationSlice.rules, delta, isAudioEnabled, lfosEnabled);
    }

    // 6. Apply Results to Engine Uniforms (Bridge)
    const combinedOffsets = modulationEngine.offsets;
    const liveModulations: Record<string, number> = {};
    
    const currentTargets = new Set(Object.keys(combinedOffsets));
    const prevTargets = activeTargetsRef.current;
    const allTargetsToProcess = new Set<string>();
    
    currentTargets.forEach(t => allTargetsToProcess.add(t));
    prevTargets.forEach(t => allTargetsToProcess.add(t));
    
    const composites = newCompositeAccumulator();

    // Track if anything visual actually changed to reset accumulation
    let hasVisualChange = false;
    
    // BATCH: Collect keys to record here, update store ONCE at end of frame
    const keysToRecord: { trackId: string, value: number }[] = [];

    // Inform AnimationEngine which tracks we are actively modulating, so it doesn't fight us
    if (isRec && allTargetsToProcess.size > 0) {
         animationEngine.setOverriddenTracks(allTargetsToProcess);
    }

    allTargetsToProcess.forEach(targetKey => {
        const isRemoved = !currentTargets.has(targetKey);
        const offset = isRemoved ? 0 : (combinedOffsets[targetKey] ?? 0);
        // NOTE: hasVisualChange is computed once after the loop by diffing this
        // frame's offsets against the previous frame's (delta-based), not here
        // per-target against zero.

        const routing = classifyModulationTarget(targetKey, storeState as unknown as Record<string, unknown>);

        // The branch chain itself lives in `planModulationTarget` — the SAME
        // dispatcher the export path runs, so a render cannot silently disagree
        // with the preview. This loop only executes the plan and adds what is
        // specific to the live tick: uniform ownership, liveModulations, and
        // keyframe capture. ADR-0109.
        const plan = planModulationTarget(
            targetKey, offset, storeState as unknown as Record<string, any>, routing, composites,
            {
                isRemoved,
                // Recording replaces the store's (already-modulated) base with the
                // clean pre-recording one, or each frame would compound the last
                // frame's modulation into the next frame's base.
                cleanBase: shouldRecord ? (trackId, naturalBase) => {
                    const snapshotSeq = animStore.recordingSnapshot;
                    if (snapshotSeq && snapshotSeq.tracks[trackId]) {
                        // MUST use the same evaluator as playback. This previously
                        // called evaluateTrackValue(keys, frame, id.includes('rotation')),
                        // which takes a Keyframe[] and so structurally cannot see
                        // postBehavior, defaulted isLog to false, and used a rotation
                        // predicate narrower than the engine's — so the recorded base
                        // disagreed with the value the timeline actually plays.
                        // evaluateTrack takes the Track and routes through the same
                        // interpolate() playback uses. Known remaining gap: it skips
                        // the evaluatePairedTrack step scrub() tries first, so
                        // camera-pair tracks can still differ slightly.
                        return animationEngine.evaluateTrack(
                            snapshotSeq.tracks[trackId],
                            animStore.currentFrame,
                        );
                    }
                    if (initialStaticValues.current[trackId] === undefined) {
                        initialStaticValues.current[trackId] = naturalBase;
                    }
                    return initialStaticValues.current[trackId];
                } : undefined,
            },
        );

        for (const u of plan.uniforms) emitUniform(u.key, u.value, u.noAccumReset);
        for (const [k, v] of plan.engineMods) engine.modulations[k] = v;
        if (plan.live !== undefined) liveModulations[targetKey] = plan.live;
        for (const r of plan.records) keysToRecord.push(r);
    });

    // --- BUFFER & THROTTLED FLUSH ---
    // The keyframe writes themselves are cheap, but each store update
    // re-renders every TrackRow + KeyframeDiamond — cost grows with recorded
    // length. Buffer per-tick captures and flush every RECORD_FLUSH_MS so the
    // visible re-render rate stays low regardless of how many keyframes have
    // accumulated.
    if (keysToRecord.length > 0) {
        // Ascending frame order, so the fast path holds: the repeat covers only
        // the prefix the ring could NOT reach, then each measured frame, then
        // the present. With no back-fill this collapses to the original single
        // [recordingStartFrame, currentFrame] range.
        if (backfillFrom > recordingStartFrame) {
            recordBuffer.push({
                startFrame: recordingStartFrame,
                endFrame: backfillFrom - 1,
                updates: keysToRecord,
            });
        }
        for (const e of backfill) recordBuffer.push(e);
        recordBuffer.push({ startFrame: currentFrame, endFrame: currentFrame, updates: keysToRecord });
    }
    if (recordBuffer.length > 0) {
        const now = performance.now();
        if (now - lastRecordFlushMs >= RECORD_FLUSH_MS) {
            flushRecordBuffer();
            lastRecordFlushMs = now;
        }
    }

    // Composites (vec axes, julia) can only be emitted once every target has
    // been planned — see flushModulationComposites.
    for (const u of flushModulationComposites(composites, storeState as unknown as Record<string, any>)) {
        emitUniform(u.key, u.value, u.noAccumReset);
    }

    // Reset accumulation only when the modulation OUTPUT actually changed
    // since the previous frame — not merely because some offset is non-zero.
    // (A constant or slow LFO used to set hasVisualChange every frame, so the
    // path tracer reset every frame and never converged.) Compare this frame's
    // offsets to last frame's: an offset appearing, vanishing, or moving past
    // epsilon counts as a real change; a moving LFO still resets (correct), a
    // static one no longer does.
    const prevOff = prevOffsets.current;
    for (const k of currentTargets) {
        if (Math.abs((combinedOffsets[k] ?? 0) - (prevOff[k] ?? 0)) > 0.0001) { hasVisualChange = true; break; }
    }
    if (!hasVisualChange) {
        for (const k in prevOff) {
            if (!currentTargets.has(k) && Math.abs(prevOff[k]) > 0.0001) { hasVisualChange = true; break; }
        }
    }
    prevOffsets.current = { ...combinedOffsets };

    // --- CRITICAL: Reset Accumulation if Visuals Changed ---
    if (hasVisualChange) {
        emitResetAccum();
    }

    // Sync to UI (Visual Feedback). Only write when values actually
    // changed — without this, every frame replaced `liveModulations`
    // with a fresh object reference, which triggered re-renders in
    // every subscribing component each frame. Combined with the
    // `?? {}` selector fallbacks (which already return a new ref per
    // call when null), this caused enough cascading renders during
    // rapid pointer events to trip React's "Maximum update depth"
    // guard inside fluid-toy's pan handler.
    _latestLiveModulations = liveModulations as Record<string, number>;
    const oldMods = storeState.liveModulations ?? {};
    const newKeys = Object.keys(liveModulations);
    const oldKeys = Object.keys(oldMods);
    const keysChanged = newKeys.length !== oldKeys.length;
    let changed = keysChanged;
    if (!changed) {
        for (let i = 0; i < newKeys.length; i++) {
            const k = newKeys[i];
            if (liveModulations[k] !== (oldMods as Record<string, number>)[k]) {
                changed = true;
                break;
            }
        }
    }
    if (changed) {
        // Throttled for the UI when the host asked for it (see the publish
        // block above). A settled value still lands: the store lags by at
        // most one interval and the next tick past it finds `changed` true.
        const nowMs = performance.now();
        if (_publishIntervalMs === 0 || keysChanged || nowMs - _lastPublishMs >= _publishIntervalMs) {
            _lastPublishMs = nowMs;
            useEngineStore.getState().setLiveModulations(liveModulations);
        }
    }
    
    // Publish the uniforms this tick owns (after the vec + julia flushes, so
    // composite uniforms like uJulia / uColorScale are included).
    modulationEngine.setOwnedUniforms(ownedUniforms);

     activeTargetsRef.current = currentTargets;
};

// React component kept as a no-op for back-compat — the legacy
// ViewportArea mounts this; the tick function above is now the sole
// owner of the recording-on/off lifecycle. Apps wiring AnimationSystem
// via the engine TickRegistry (the modern path) don't need to mount
// this at all.
export const AnimationSystem: React.FC = () => null;
