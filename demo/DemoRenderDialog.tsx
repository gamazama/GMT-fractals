// Video-export dialog. Registered via `registerRenderPopup(Component)`
// — the shared <TimelineToolbar /> renders its "Render" button only
// when a popup is registered. Per output frame: scrub → modulate →
// yield → encodeCanvas. Fluid-toy / engine-gmt need a TSAA convergence
// loop here; the demo's canvas is deterministic per slice snapshot, so
// one yield to React is enough.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { animationEngine } from '../engine/AnimationEngine';
import { modulationEngine } from '../engine/features/modulation/ModulationEngine';
import { MainThreadEncoder, canEncodeFormat } from '../engine/export/videoEncoder';
import { VIDEO_FORMATS, VIDEO_CONFIG } from '../data/constants';
import { downloadBlob } from '../utils/SceneFormat';
import { getDemoCanvas } from './demoCanvasRef';

interface Props {
    onClose: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// Yield to React: a microtask + a macrotask is enough for slice
// changes from animationEngine.scrub() to flush through the demo's
// repaint useEffect before we encode the resulting canvas.
const yieldToReact = () => sleep(0);

const VIDEO_ONLY = VIDEO_FORMATS
    .map((f, i) => ({ ...f, originalIndex: i }))
    .filter((f) => !f.imageSequence);

export const DemoRenderDialog: React.FC<Props> = ({ onClose }) => {
    const animStore = useAnimationStore();
    const fps = animStore.fps;
    const durationFrames = animStore.durationFrames;

    // ─── Form state ────────────────────────────────────────────────
    const [width, setWidth]         = useState(1280);
    const [height, setHeight]       = useState(720);
    const [formatIndex, setFormatIndex] = useState(VIDEO_ONLY[0]?.originalIndex ?? 0);
    const [bitrate, setBitrate]     = useState(VIDEO_CONFIG.DEFAULT_BITRATE);
    const [startFrame, setStartFrame] = useState(0);
    const [endFrame, setEndFrame]   = useState(durationFrames);

    // Auto-scale recommended bitrate against 1080p so resolution edits
    // don't require manually retuning the field.
    useEffect(() => {
        const target = width * height;
        const ref    = 1920 * 1080;
        setBitrate(Math.max(1, Math.round(40 * (target / ref))));
    }, [width, height]);

    // ─── Run state ─────────────────────────────────────────────────
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress]       = useState(0);
    const [status, setStatus]           = useState('');
    const [error, setError]             = useState<string | null>(null);
    const cancelRef = useRef(false);

    const totalFrames = useMemo(
        () => Math.max(1, endFrame - startFrame + 1),
        [startFrame, endFrame],
    );

    const onStart = async () => {
        const canvas = getDemoCanvas();
        if (!canvas) {
            setError('Demo canvas is not mounted yet — close this dialog and re-open after the canvas paints.');
            return;
        }
        // Even-pixel align — H.264 / HEVC chroma subsampling rejects odd
        // dimensions. WebM doesn't care but the round-down keeps the rule
        // uniform across formats.
        const safeWidth  = Math.max(2, Math.floor(width  / 2) * 2);
        const safeHeight = Math.max(2, Math.floor(height / 2) * 2);

        const probe = await canEncodeFormat(formatIndex, safeWidth, safeHeight, bitrate);
        if (!probe.ok) {
            setError(probe.reason ?? 'Browser rejected this format.');
            return;
        }

        // Snapshot state we'll restore on finish / cancel.
        const prevCanvasW   = canvas.width;
        const prevCanvasH   = canvas.height;
        const prevWasPlaying = animStore.isPlaying;
        const prevFrame      = animStore.currentFrame;
        if (prevWasPlaying) useAnimationStore.getState().pause();

        // Resize the drawing buffer to the export dimensions. The
        // overlay's ResizeObserver only watches CSS size, so the
        // override sticks until we put it back.
        canvas.width  = safeWidth;
        canvas.height = safeHeight;

        const encoder = new MainThreadEncoder();
        try {
            cancelRef.current = false;
            setError(null);
            setIsRendering(true);
            setStatus('Starting encoder…');
            await encoder.start({
                width:       safeWidth,
                height:      safeHeight,
                fps,
                bitrate,
                formatIndex,
            }, null);

            const totalOut = endFrame - startFrame + 1;
            const dt = 1 / fps;
            for (let i = 0; i < totalOut; i++) {
                if (cancelRef.current) break;
                const frameIdx = startFrame + i;

                // Scrub timeline + apply modulations for this frame's
                // deterministic time. Mirrors the live modulation tick
                // exactly, so the export looks identical to a
                // "scrub-then-pause" preview.
                animationEngine.scrub(frameIdx);
                const time = frameIdx * dt;
                modulationEngine.resetOffsets();
                const engineState = useEngineStore.getState();
                modulationEngine.updateOscillators(engineState.animations, time, dt);
                const modSlice = (engineState as { modulation?: { rules?: unknown[] } }).modulation;
                if (modSlice?.rules?.length) modulationEngine.update(modSlice.rules as never[], dt);
                engineState.setLiveModulations({ ...modulationEngine.offsets });

                // Yield so React commits the slice writes through the
                // overlay's repaint useEffect before we sample the canvas.
                await yieldToReact();
                encoder.encodeCanvas(canvas, i);

                setProgress((i + 1) / totalOut);
                setStatus(`Frame ${i + 1} / ${totalOut}`);
            }

            if (cancelRef.current) {
                encoder.cancel();
                setStatus('Cancelled.');
            } else {
                setStatus('Finalising file…');
                const buffer = await encoder.finish();
                if (buffer) {
                    const formatDef = VIDEO_FORMATS[formatIndex];
                    const blob = new Blob([buffer], { type: formatDef.mime });
                    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    downloadBlob(blob, `demo-${stamp}.${formatDef.ext}`);
                    setStatus('Saved.');
                }
            }
        } catch (e) {
            encoder.cancel();
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            // Restore canvas display size (the next ResizeObserver tick
            // would do it anyway, but explicit avoids a one-frame flash).
            canvas.width  = prevCanvasW;
            canvas.height = prevCanvasH;
            // Restore animation state.
            animationEngine.scrub(prevFrame);
            if (prevWasPlaying) useAnimationStore.getState().play();
            setIsRendering(false);
        }
    };

    // Portal to <body> so the modal escapes the timeline toolbar's
    // stacking context — without this `position: fixed` would scope to
    // the toolbar (or any ancestor with transform / filter / will-
    // change), centering the dialog on the timeline strip rather than
    // the viewport and pushing the bottom off the screen.
    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="bg-neutral-900 border border-white/10 rounded-lg shadow-2xl w-[360px] max-h-[90vh] overflow-y-auto p-5 text-xs text-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-cyan-400">Render Video</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isRendering}
                        className="text-gray-400 hover:text-white disabled:opacity-40"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {!isRendering && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="block text-gray-500 mb-1">Width</span>
                                <input
                                    type="number"
                                    value={width}
                                    min={2}
                                    max={3840}
                                    onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-gray-500 mb-1">Height</span>
                                <input
                                    type="number"
                                    value={height}
                                    min={2}
                                    max={2160}
                                    onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="block text-gray-500 mb-1">Format</span>
                            <select
                                value={formatIndex}
                                onChange={(e) => setFormatIndex(parseInt(e.target.value, 10))}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                            >
                                {VIDEO_ONLY.map((f) => (
                                    <option key={f.originalIndex} value={f.originalIndex}>{f.label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="block text-gray-500 mb-1">Bitrate (Mbps)</span>
                            <input
                                type="number"
                                value={bitrate}
                                min={1}
                                onChange={(e) => setBitrate(parseInt(e.target.value, 10) || 1)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="block text-gray-500 mb-1">Start frame</span>
                                <input
                                    type="number"
                                    value={startFrame}
                                    min={0}
                                    max={endFrame}
                                    onChange={(e) => setStartFrame(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-gray-500 mb-1">End frame</span>
                                <input
                                    type="number"
                                    value={endFrame}
                                    min={startFrame}
                                    onChange={(e) => setEndFrame(Math.max(startFrame, parseInt(e.target.value, 10) || 0))}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                                />
                            </label>
                        </div>

                        <div className="text-[10px] text-gray-500">
                            {totalFrames} frame{totalFrames === 1 ? '' : 's'} @ {fps} fps · {(totalFrames / fps).toFixed(2)}s
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded px-2 py-1.5 text-[10px]">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onStart}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-3 py-2 transition-colors"
                            >
                                Start render
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {isRendering && (
                    <div className="space-y-3">
                        <div className="text-gray-400">{status}</div>
                        <div className="w-full h-2 bg-black/40 rounded overflow-hidden">
                            <div
                                className="h-full bg-cyan-500 transition-[width] duration-150"
                                style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-gray-500 tabular-nums">
                            {Math.round(progress * 100)}%
                        </div>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded px-2 py-1.5 text-[10px]">
                                {error}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => { cancelRef.current = true; }}
                            className="w-full bg-white/5 hover:bg-white/10 text-gray-300 rounded px-3 py-2 transition-colors"
                        >
                            Cancel render
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
