// Demo's per-frame export pipeline. Plugged into the engine's render
// dialog plugin; the dialog owns UI + flags + status, the runner owns
// the actual encode.

import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import { applyModulationsAt } from '../engine/features/modulation/applyAt';
import { MainThreadEncoder } from '../engine/export/videoEncoder';
import { VIDEO_FORMATS } from '../data/constants';
import { downloadBlob } from '../utils/SceneFormat';
import { calcEtaRange } from '../components/timeline/exportHelpers';
import type { RenderDialogRunner } from '../engine/plugins/RenderDialog';
import { getDemoCanvas } from './demoCanvasRef';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// One yield (microtask + macrotask) is enough for slice changes from
// animationEngine.scrub() to flush through the demo's repaint useEffect
// before we sample the canvas. Apps with TSAA / accumulation need their
// own convergence loop in their runner.
const yieldToReact = () => sleep(0);

export const demoRenderRunner: RenderDialogRunner = async ({ cfg, flags, status, isDiskMode }) => {
    const canvas = getDemoCanvas();
    if (!canvas) {
        alert('Demo canvas not mounted yet — close this dialog and re-open after the canvas paints.');
        status.setIsRendering(false);
        return;
    }

    // Even-pixel align — H.264 / HEVC chroma subsampling rejects odd
    // dimensions. WebM doesn't care but the rule is uniform.
    const safeWidth  = Math.max(2, Math.floor(cfg.width  / 2) * 2);
    const safeHeight = Math.max(2, Math.floor(cfg.height / 2) * 2);

    // Snapshot state we'll restore on finish / cancel.
    const prevCanvasW    = canvas.width;
    const prevCanvasH    = canvas.height;
    const animStore      = useAnimationStore.getState();
    const prevWasPlaying = animStore.isPlaying;
    const prevFrame      = animStore.currentFrame;

    // Resize the drawing buffer to the export dimensions. The overlay's
    // ResizeObserver only watches CSS size, so the override sticks.
    canvas.width  = safeWidth;
    canvas.height = safeHeight;

    const encoder = new MainThreadEncoder();
    const totalFrames = Math.max(1, Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1);
    status.setIsRendering(true);
    status.setProgress(0);
    status.setStatusText('Starting encoder…');

    try {
        await encoder.start(
            { width: safeWidth, height: safeHeight, fps: cfg.fps, bitrate: cfg.bitrate, formatIndex: cfg.formatIndex },
            null,
        );
        status.setStatusText('Rendering to RAM…');

        const dt = 1 / cfg.fps;
        let lastFrameStart = Date.now();

        for (let i = 0; i < totalFrames; i++) {
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            // Pause loop — honour Interrupt until user resumes / discards / finishes.
            while (flags.stoppingRef.current && !flags.cancelledRef.current && !flags.finishEarlyRef.current) {
                await sleep(100);
            }
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            const timelineFrame = cfg.startFrame + i * Math.max(1, cfg.frameStep);
            const time          = timelineFrame * dt;

            // Scrub timeline + apply oscillator + rule modulations for
            // this frame's deterministic time.
            animationEngine.scrub(timelineFrame);
            applyModulationsAt(time, dt);

            // Yield so React commits the slice writes through the
            // overlay's repaint useEffect before we sample the canvas.
            await yieldToReact();
            encoder.encodeCanvas(canvas, i);

            const now = Date.now();
            status.setLastFrameTime((now - lastFrameStart) / 1000);
            lastFrameStart = now;

            const elapsed = (now - flags.startTimeRef.current) / 1000;
            status.setElapsedTime(elapsed);
            status.setEtaRange(calcEtaRange(elapsed, i + 1, totalFrames));
            status.setProgress((i + 1) / totalFrames);
            status.setStatusText(`Frame ${i + 1} / ${totalFrames}`);
        }

        if (flags.cancelledRef.current) {
            encoder.cancel();
            status.setStatusText('Cancelled.');
        } else {
            status.setStatusText('Finalising file…');
            const buffer = await encoder.finish();
            if (buffer) {
                const formatDef = VIDEO_FORMATS[cfg.formatIndex];
                const blob = new Blob([buffer], { type: formatDef.mime });
                const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                downloadBlob(blob, `demo-${stamp}.${formatDef.ext}`);
                status.setStatusText(flags.finishEarlyRef.current ? 'Finished early.' : 'Saved.');
            }
        }
    } catch (e) {
        encoder.cancel();
        status.setStatusText(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        canvas.width  = prevCanvasW;
        canvas.height = prevCanvasH;
        animationEngine.scrub(prevFrame);
        if (prevWasPlaying) useAnimationStore.getState().play();
        status.setIsRendering(false);
        status.setIsStopping(false);
    }
    // isDiskMode could route through showSaveFilePicker for streaming
    // disk writes — the demo doesn't need it (output is small).
    void isDiskMode;
};
