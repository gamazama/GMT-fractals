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
 *
 * THE FILE (2026-10-11)
 *   - INTO A PICKED FILE (the dialog's badge says DISK) the video is written
 *     AS THE RUN GOES: the encoder is asked for `mp4FastStart: false`, so an
 *     MP4's frames leave in chunks of 16 MiB and its index is written last.
 *     Until that day the whole MP4 was held in memory until the last frame,
 *     under a badge that said DISK. WebM was always written as it goes.
 *   - WITHOUT A PICKED FILE (no picker in this browser, or it was refused: the
 *     badge says RAM) nothing changed: the video is made in memory, an MP4's
 *     index at the front, and saved as a download.
 *   - A KEYFRAME A SECOND in both (`keyFrameEvery`: the rate the frames play
 *     at). Left to itself the codec makes one for the whole video, which an
 *     editor cannot scrub.
 *   - HELD BACK FOR THE CODEC. After a frame is handed to the encoder the run
 *     waits while more than `MAX_QUEUED` frames are still in the codec's queue
 *     (`MainThreadEncoder.queueSize`; the deep zoomer's runner does the same).
 *     Without it "written as it goes" was not true here whatever the layout:
 *     this loop makes frames faster than the codec takes them, and they wait
 *     as PICTURES (measured, 300 frames at 2560 x 1440: up to 297 in the
 *     queue at once and 2 of 299 encoded when the last frame was made; in
 *     another run 174 and 124), so little or nothing reached the file before
 *     the run's end. Held back, the same render had at most 2 waiting, 296 of
 *     299 encoded when the last frame was made, and 32 of its 36.9 MiB in
 *     the file by then (three runs alike). It holds in RAM mode too, where it
 *     is the pictures in the queue that are spared, not the file.
 *   - DISCARD (or an error) REALLY THROWS THE FILE AWAY. The encoder is handed
 *     a stream that forwards to the file (`forwardToPickedFile`,
 *     engine/export/pickedFile.ts), and the file itself is aborted: a new file
 *     is removed where the browser can, a file picked to be replaced keeps
 *     what it held. Before, this runner handed over the file's own stream,
 *     which the encoder locks: its `stream.close()` after a cancel threw, the
 *     throw was swallowed, and the file stayed open for as long as the page.
 *
 * @assumption THE FILE above was measured in this app's own dialog on
 *   2026-10-11, Chrome on the real GPU, the picker stood in for by a real File
 *   System Access file that records every write
 *   (debug/scratch/gmt-export/gmt-video.mts with APP=fluid-toy.html,
 *   git-ignored): each of the four formats into a picked file and in memory,
 *   75 frames each, read back (3 keyframes, at 0, 1 and 2 s; the index after
 *   the media data in a picked file, before it in memory) and played to the
 *   end by a <video>; a 2560 x 1440 H.264 of 300 frames (36.9 MiB) of which
 *   32 MiB reach the file before its last frame, the first 16 after frame 112
 *   or so (at 1920 x 1080 the same 300 frames make 20 to 26 MiB: one 16 MiB
 *   chunk, full only as the run ends); Interrupt then Finish (a file of the
 *   frames made, which plays); Discard into a new file (aborted, and removed)
 *   and into one picked to be replaced (it keeps its bytes).
 *   BROKEN ON PURPOSE once: the cancel path closing the stream as it used to
 *   -> "the stream was ABORTED, not closed (aborted false, closed false)".
 *   NO STANDING GUARD: `npm run smoke:fluid-toy` boots the app and opens no
 *   render dialog.
 */

import { useAnimationStore } from '../../../store/animationStore';
import { useEngineStore } from '../../../store/engineStore';
import { animationEngine } from '../../../engine/AnimationEngine';
import { applyModulationsAt } from '../../../engine/features/modulation/applyAt';
import { MainThreadEncoder } from '../../../engine/export/videoEncoder';
import { forwardToPickedFile } from '../../../engine/export/pickedFile';
import type { PickedFile } from '../../../engine/export/pickedFile';
import { VIDEO_FORMATS } from '../../../data/constants';
import { getExportFileName } from '../../../utils/fileUtils';
import type { RenderDialogRunner } from '../../../engine/plugins/RenderDialog';
import { calcEtaRange } from '../../../components/timeline/exportHelpers';
import { appEngine } from '../../engineHandles';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Yield a microtask + a macrotask so React flushes pending state writes
 *  (animationEngine.scrub mutates store, useEngineSync's useEffect runs on
 *  commit, sync<X>ToEngine pushes new params into the engine). Without this
 *  the convergence loop runs against the previous frame's params. */
const yieldToReact = () => sleep(0);

/** Frames the video encoder may have waiting before the run holds the next
 *  one back (each holds its picture). The deep zoomer's runner uses the same
 *  number (grep `MAX_QUEUED` in deep-zoom/routeRender.tsx). See HELD BACK in
 *  the header. */
const MAX_QUEUED = 2;

const computeTotalFrames = (cfg: { startFrame: number; endFrame: number; frameStep: number }) =>
    Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;

export const runVideoExport: RenderDialogRunner = async (deps) => {
    const { cfg, flags, status, isDiskMode } = deps;
    const engine = appEngine.ref.current;
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
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
    // The encoder is handed `picked.stream`, which forwards to the file, never
    // the file's own stream (see THE FILE in the header).
    let picked: PickedFile | null = null;
    if (isDiskMode) {
        try {
            // @ts-expect-error — File System Access API not in default lib targets
            const handle = await window.showSaveFilePicker({
                suggestedName: outputFileName,
                types: [{ description: formatDef.label, accept: { [formatDef.mime]: [`.${formatDef.ext}`] } }],
            });
            picked = forwardToPickedFile(handle, await handle.createWritable());
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
            const isSecurityError = err instanceof DOMException && err.name === 'SecurityError';
            if (!isSecurityError) {
                alert('Could not start export. Error: ' + (err instanceof Error ? err.message : String(err)));
                return;
            }
            // Fall through to RAM mode silently — same behaviour as engine-gmt.
            picked = null;
        }
    }
    const stream: WritableStream | null = picked ? picked.stream : null;

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
        // Output rate, not the timeline's — a stepped export renders every Nth
        // frame, so encoding at the timeline rate would compress it into a
        // time-lapse. Step is a cost reduction for previews, so the preview
        // should run at the speed the animation actually plays.
        // fluid-toy carries no audio, so unlike app-gmt there was no desync
        // here — this keeps the two apps' definition of Step the same.
        const outputFps = cfg.fps / Math.max(1, cfg.frameStep);
        await encoder.start({
            width:       safeWidth,
            height:      safeHeight,
            fps:         outputFps,
            bitrate:     cfg.bitrate,
            formatIndex: cfg.formatIndex,
            // Into a picked file: as the run goes, an MP4's index last. In
            // memory: the index at the front, as it always was.
            mp4FastStart:  stream ? false : 'in-memory',
            // A keyframe a second: the codec alone makes ONE for the whole video.
            keyFrameEvery: Math.max(1, Math.round(outputFps)),
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
            applyModulationsAt(time, dt);

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
            // Do not outrun the codec (HELD BACK in the header). The sim is
            // force-paused and no frame is drawn while this waits, so the
            // picture is the same either way. A Discard ends the wait.
            while (encoder.queueSize > MAX_QUEUED && !flags.cancelledRef.current) await sleep(10);

            // Plugin expects 0..1; it formats as percent for display.
            status.setProgress((i + 1) / totalFrames);
            status.setStatusText(`Frame ${i + 1} / ${totalFrames}`);
            const elapsed = (Date.now() - flags.startTimeRef.current) / 1000;
            status.setElapsedTime(elapsed);
            status.setEtaRange(calcEtaRange(elapsed, i + 1, totalFrames));
            status.setLastFrameTime(elapsed / (i + 1));
        }

        if (flags.cancelledRef.current) {
            encoder.cancel();
            status.setStatusText('Cancelled.');
            await picked?.discard();   // the half-written file is aborted, not left open
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
        await picked?.discard();       // no index was written: what is there cannot play
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
