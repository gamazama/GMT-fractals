/**
 * fluid-toy video export — deterministic per-frame ratchet.
 *
 * Each output frame:
 *   1. Scrub animation timeline to frame i (drives julia.center_x/_y/zoom keys).
 *   2. Apply LFO/rule modulations for the controlled time.
 *   3. Yield to React so slice→engine sync useEffects commit before we converge.
 *   4. With sim force-paused, hammer engine.frame() at a fixed timestamp until
 *      TSAA converges (Julia gets a clean integration over per-frame jitter).
 *   5. Unpause sim, advance the engine clock by exactly 1/fps and call
 *      engine.frame() once — sim steps by dt = 1/fps; renderJulia is a no-op
 *      because TSAA is already converged; composite + display run with the
 *      fresh dye state.
 *   6. Encode the canvas as a VideoFrame at frame index i.
 *   7. resetAccumulation, repeat.
 *
 * Saved/restored across the run: render size, params.paused, force-pause state,
 * animation `currentFrame` + `isPlaying`. Live modulations / oscillators are
 * left where the run lands them — the user already chose to pause playback by
 * opening the dialog, and clobbering them on cancel would surprise more than
 * it would help.
 */

import { useAnimationStore } from '../../../store/animationStore';
import { useEngineStore } from '../../../store/engineStore';
import { animationEngine } from '../../../engine/AnimationEngine';
import { modulationEngine } from '../../../engine/features/modulation/ModulationEngine';
import { MainThreadEncoder } from '../../../engine/export/videoEncoder';
import { VIDEO_FORMATS } from '../../../data/constants';
import { getExportFileName } from '../../../utils/fileUtils';
import type { RenderRunDeps } from './types';

const calcEtaRange = (elapsedSec: number, framesDone: number, totalFrames: number) => {
    if (framesDone <= 0) return { min: 0, max: 0 };
    const eta = (totalFrames - framesDone) * (elapsedSec / framesDone);
    return { min: eta * 0.9, max: eta * 1.1 };
};

/** Apply oscillator/rule modulation offsets for the controlled `time` /`dt`,
 *  publish them into `liveModulations`. Fluid-toy slices read `liveModulations`
 *  via `useLiveModulations()` in `useEngineSync` — pushing the same map the
 *  live tick would have written keeps the export visually identical to a
 *  scrub-then-pause snapshot. */
const applyExportModulations = (time: number, dt: number) => {
    const storeState = useEngineStore.getState();
    modulationEngine.resetOffsets();
    modulationEngine.updateOscillators(storeState.animations, time, dt);
    const modSlice = (storeState as { modulation?: { rules?: unknown[] } }).modulation;
    if (modSlice && Array.isArray(modSlice.rules) && modSlice.rules.length > 0) {
        modulationEngine.update(modSlice.rules as never[], dt);
    }
    storeState.setLiveModulations({ ...modulationEngine.offsets });
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Yield a microtask + a macrotask so React flushes pending state writes
 *  (animationEngine.scrub mutates store, useEngineSync's useEffect runs on
 *  commit, sync<X>ToEngine pushes new params into the engine). Without this
 *  the convergence loop runs against the previous frame's params. */
const yieldToReact = () => sleep(0);

const computeTotalFrames = (cfg: { startFrame: number; endFrame: number; frameStep: number }) =>
    Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;

export const runVideoExport = async (deps: RenderRunDeps): Promise<void> => {
    const { cfg, flags, status, isDiskMode, getEngine, getCanvas } = deps;
    const engine = getEngine();
    const canvas = getCanvas();
    if (!engine || !canvas) {
        alert('Renderer is not booted yet — try again in a moment.');
        return;
    }

    const formatDef = VIDEO_FORMATS[cfg.formatIndex];
    if (!formatDef || formatDef.imageSequence) {
        alert('Image-sequence formats are not supported in fluid-toy v1. Pick MP4 or WebM.');
        return;
    }

    // 2-pixel align — required by H.264/HEVC chroma subsampling. WebM ignores
    // it but we keep the rule for consistency.
    const safeWidth  = Math.max(2, Math.floor(cfg.width  / 2) * 2);
    const safeHeight = Math.max(2, Math.floor(cfg.height / 2) * 2);

    // Save state for restoration in `finally`.
    const savedCanvasW         = canvas.width;
    const savedCanvasH         = canvas.height;
    const savedParamsPaused    = engine.params.paused;
    const animState            = useAnimationStore.getState();
    const savedFrame           = animState.currentFrame;
    const savedIsPlaying       = animState.isPlaying;

    const projectName = (useEngineStore.getState() as { projectSettings?: { name?: string } })
        .projectSettings?.name ?? 'fluid-toy';
    const outputFileName = getExportFileName(projectName, 1, formatDef.ext, `${safeWidth}x${safeHeight}`);

    // Disk-mode file picker. Transient activation is preserved across awaits,
    // so this works even though `runVideoExport` is async.
    let stream: WritableStream | null = null;
    if (isDiskMode) {
        try {
            // @ts-expect-error — File System Access API not in default lib targets
            const handle = await window.showSaveFilePicker({
                suggestedName: outputFileName,
                types: [{ description: formatDef.label, accept: { [formatDef.mime]: [`.${formatDef.ext}`] } }],
            });
            stream = await handle.createWritable();
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
            const isSecurityError = err instanceof DOMException && err.name === 'SecurityError';
            if (!isSecurityError) {
                alert('Could not start export. Error: ' + (err instanceof Error ? err.message : String(err)));
                return;
            }
            // Fall through to RAM mode silently — same behaviour as engine-gmt.
            stream = null;
        }
    }

    if (savedIsPlaying) animState.pause();

    flags.cancelledRef.current   = false;
    flags.finishEarlyRef.current = false;
    flags.stoppingRef.current    = false;
    flags.startTimeRef.current   = Date.now();

    status.setIsRendering(true);
    status.setIsStopping(false);
    status.setProgress(0);
    status.setElapsedTime(0);
    status.setEtaRange({ min: 0, max: 0 });
    status.setLastFrameTime(0);
    status.setStatusText('Initializing encoder…');

    const totalFrames = computeTotalFrames(cfg);
    const sampleCap   = Math.max(1, Math.floor(cfg.samplesPerFrame));

    // Switch the engine to the requested output resolution. Both the canvas
    // drawing buffer and the sim/fractal grids resize together — bilinear
    // reproject preserves whatever dye + accumulator state was alive when
    // the dialog opened.
    engine.setRenderSize(safeWidth, safeHeight);

    // Force the sim paused for the convergence loops + start the deterministic
    // engine clock. One throwaway frame() with the clock at 0 syncs lastTimeMs
    // so the first real sim step gets dt = 1/fps cleanly (otherwise dt would
    // be `(0 - lastRAFtime)/1000` clamped at the engine's 50ms ceiling).
    engine.setForceFluidPaused(true);
    engine.params.paused = false; // we drive sim through forceFluidPaused only
    let engineClockMs = 0;
    engine.frame(engineClockMs);

    const encoder = new MainThreadEncoder();

    try {
        await encoder.start({
            width:       safeWidth,
            height:      safeHeight,
            fps:         cfg.fps,
            bitrate:     cfg.bitrate,
            formatIndex: cfg.formatIndex,
        }, stream);

        status.setStatusText(stream ? 'Rendering to disk…' : 'Rendering to RAM…');

        for (let i = 0; i < totalFrames; i++) {
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            // Pause loop — honour `Interrupt Render` until user resumes / discards / finishes.
            while (flags.stoppingRef.current && !flags.cancelledRef.current && !flags.finishEarlyRef.current) {
                await sleep(100);
            }
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            const timelineFrame = cfg.startFrame + i * cfg.frameStep;
            const time          = timelineFrame / cfg.fps;
            const dt            = 1 / cfg.fps;

            animationEngine.scrub(timelineFrame);
            applyExportModulations(time, dt);

            // Let useEngineSync's slice useEffects flush pushed params into engine.
            await yieldToReact();

            // ─── Converge TSAA ───
            engine.setForceFluidPaused(true);
            engine.resetAccumulation();
            // Cap the loop so a misconfigured cap can't hang the export.
            const maxConvergeIters = sampleCap * 4 + 8;
            for (let s = 0; s < maxConvergeIters; s++) {
                engine.frame(engineClockMs);
                if (engine.getAccumulationCount() >= sampleCap) break;
            }

            // ─── Step sim by exactly 1/fps and let composite + display run ───
            engine.setForceFluidPaused(false);
            engineClockMs += 1000 / cfg.fps;
            engine.frame(engineClockMs);
            engine.setForceFluidPaused(true);

            // ─── Capture + encode ───
            encoder.encodeCanvas(canvas, i);

            const pct = ((i + 1) / totalFrames) * 100;
            status.setProgress(pct);
            const elapsed = (Date.now() - flags.startTimeRef.current) / 1000;
            status.setElapsedTime(elapsed);
            status.setEtaRange(calcEtaRange(elapsed, i + 1, totalFrames));
            status.setLastFrameTime(elapsed / (i + 1));
        }

        if (flags.cancelledRef.current) {
            encoder.cancel();
            status.setStatusText('Cancelled.');
            try { await stream?.close(); } catch { /* may already be closed */ }
        } else {
            status.setStatusText('Finalizing video…');
            const blob = await encoder.finish();
            if (blob && !stream) {
                const blobObj = new Blob([blob], { type: formatDef.mime });
                const url     = URL.createObjectURL(blobObj);
                const a       = document.createElement('a');
                a.href     = url;
                a.download = outputFileName;
                a.click();
                URL.revokeObjectURL(url);
            }
            status.setStatusText(flags.finishEarlyRef.current ? 'Finished early.' : 'Complete!');
        }
    } catch (e) {
        console.error('[fluid-toy/RenderDialog] Export failed', e);
        alert(`Export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
        encoder.cancel();
        try { await stream?.close(); } catch { /* may already be closed */ }
    } finally {
        // Restore engine + animation state so the live viewport behaves
        // exactly as it did before the user opened the dialog. setRenderSize
        // self-no-ops when the dims already match, so we don't need to guard.
        engine.setForceFluidPaused(false);
        engine.params.paused = savedParamsPaused;
        engine.setRenderSize(savedCanvasW, savedCanvasH);
        engine.resetAccumulation();
        animationEngine.scrub(savedFrame);
        if (savedIsPlaying) useAnimationStore.getState().play();
        status.setIsRendering(false);
        status.setIsStopping(false);
    }
};
