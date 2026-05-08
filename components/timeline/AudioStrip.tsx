import React, { useEffect, useRef } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { audioAnalysisEngine } from '../../engine/features/audioMod/AudioAnalysisEngine';
import { computeWaveformPeaks } from '../../utils/audioWaveform';
import { AudioClip } from '../../store/animation/types';
import { setAudioFile, clearAudioFile } from '../../engine/animation/audioFileCache';
import { CloseIcon, UploadIcon } from '../Icons';

const STRIP_HEIGHT = 48;

type DragMode = 'move' | 'trim_left' | 'trim_right';

interface DragState {
    mode: DragMode;
    startClientX: number;
    startStartFrame: number;
    startTrimStart: number;
    startTrimEnd: number;
}

const Waveform: React.FC<{ peaks: number[]; widthPx: number; trimRange: [number, number]; durationSec: number }> = ({ peaks, widthPx, trimRange, durationSec }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const cssW = Math.max(1, widthPx);
        const cssH = STRIP_HEIGHT - 16;
        canvas.width  = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cssW, cssH);

        if (peaks.length === 0 || durationSec <= 0) return;

        // Map only the trimmed portion to the strip width.
        const trimSpanSec = Math.max(1e-6, trimRange[1] - trimRange[0]);
        const startBucket = (trimRange[0] / durationSec) * peaks.length;
        const endBucket   = (trimRange[1] / durationSec) * peaks.length;
        const bucketSpan  = endBucket - startBucket;

        const mid = cssH / 2;
        ctx.fillStyle = 'rgb(34 211 238 / 0.6)'; // cyan-400/60
        for (let x = 0; x < cssW; x++) {
            const idx = startBucket + (x / cssW) * bucketSpan;
            const i0 = Math.floor(idx);
            const i1 = Math.min(peaks.length - 1, i0 + 1);
            const t = idx - i0;
            const peak = (peaks[i0] ?? 0) * (1 - t) + (peaks[i1] ?? 0) * t;
            const h = peak * (cssH * 0.9);
            ctx.fillRect(x, mid - h / 2, 1, Math.max(1, h));
        }
        // Mid-line
        ctx.fillStyle = 'rgb(34 211 238 / 0.25)';
        ctx.fillRect(0, mid - 0.5, cssW, 1);
    }, [peaks, widthPx, trimRange[0], trimRange[1], durationSec]);

    return <canvas ref={canvasRef} style={{ width: widthPx, height: STRIP_HEIGHT - 16, display: 'block' }} />;
};

const waitForAudioMetadata = (deckIndex: 0 | 1, timeoutMs = 4000): Promise<number> => {
    const start = performance.now();
    return new Promise(resolve => {
        const tick = () => {
            const info = audioAnalysisEngine.getTrackInfo(deckIndex);
            if (info.duration > 0 && Number.isFinite(info.duration)) {
                resolve(info.duration);
                return;
            }
            if (performance.now() - start > timeoutMs) {
                resolve(0);
                return;
            }
            setTimeout(tick, 50);
        };
        tick();
    });
};

const EmptyDeckSlot: React.FC<{ deckIndex: 0 | 1; sidebarWidth: number }> = ({ deckIndex, sidebarWidth }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const setAudioClip    = useAnimationStore(s => s.setAudioClip);
    const updateAudioClip = useAnimationStore(s => s.updateAudioClip);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        audioAnalysisEngine.loadTrack(deckIndex, file);
        setAudioFile(deckIndex, file);

        // Register an optimistic clip immediately so the strip renders with
        // the file name + a Decoding… overlay while peaks compute. Duration
        // gets a placeholder (60s) until the deck reports its true length.
        const id = `clip-${deckIndex}-${Date.now()}`;
        setAudioClip(deckIndex, {
            id, deckIndex,
            fileName: file.name,
            durationSeconds: 60,
            startFrame: 0,
            trimStartSec: 0,
            trimEndSec: 60,
        });

        // Get the real duration from the underlying <audio> element ASAP so
        // the strip's width matches reality even before the waveform decode
        // finishes.
        waitForAudioMetadata(deckIndex).then(dur => {
            if (dur > 0) updateAudioClip(deckIndex, { durationSeconds: dur, trimEndSec: dur });
        });

        try {
            const { peaks, durationSeconds } = await computeWaveformPeaks(file);
            updateAudioClip(deckIndex, { peaks, durationSeconds, trimEndSec: durationSeconds });
        } catch (err) {
            console.error('Audio decode failed', err);
            // No peaks — strip stays without waveform but the clip is still
            // playable + draggable. waitForAudioMetadata above keeps the
            // duration honest.
        }
    };

    return (
        <div className="flex border-b border-white/5 bg-transparent" style={{ height: STRIP_HEIGHT }}>
            <div
                className="sticky left-0 z-30 bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center px-3"
                style={{ width: sidebarWidth }}
            >
                <span className="text-[10px] font-bold text-gray-500">Audio {String.fromCharCode(65 + deckIndex)}</span>
            </div>
            <div className="flex-1 flex items-center justify-start pl-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 border border-dashed border-white/10 rounded text-[9px] text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all font-bold flex items-center gap-1"
                >
                    <UploadIcon /> Load Audio
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
            </div>
        </div>
    );
};

interface AudioStripProps {
    clip: AudioClip;
    frameWidth: number;
    sidebarWidth: number;
    fps: number;
}

const AudioStripInner: React.FC<AudioStripProps> = ({ clip, frameWidth, sidebarWidth, fps }) => {
    const updateAudioClip = useAnimationStore(s => s.updateAudioClip);
    const setAudioClip    = useAnimationStore(s => s.setAudioClip);
    const dragRef = useRef<DragState | null>(null);

    const trimSpanSec = Math.max(1e-6, clip.trimEndSec - clip.trimStartSec);
    const widthPx = trimSpanSec * fps * frameWidth;
    const leftPx  = clip.startFrame * frameWidth;

    const startDrag = (mode: DragMode) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            mode,
            startClientX: e.clientX,
            startStartFrame: clip.startFrame,
            startTrimStart: clip.trimStartSec,
            startTrimEnd: clip.trimEndSec,
        };
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const d = dragRef.current;
            if (!d) return;
            const dx = e.clientX - d.startClientX;
            const dFrame = dx / frameWidth;
            const dSec = dFrame / Math.max(1, fps);

            if (d.mode === 'move') {
                updateAudioClip(clip.deckIndex, {
                    startFrame: Math.max(0, Math.round(d.startStartFrame + dFrame))
                });
            } else if (d.mode === 'trim_left') {
                // Trimming the left edge advances the in-point and shifts the
                // visible startFrame so the audio's right edge stays fixed.
                const newTrimStart = Math.max(0, Math.min(d.startTrimEnd - 0.05, d.startTrimStart + dSec));
                const trimDelta = newTrimStart - d.startTrimStart;
                updateAudioClip(clip.deckIndex, {
                    trimStartSec: newTrimStart,
                    startFrame: Math.max(0, Math.round(d.startStartFrame + trimDelta * fps)),
                });
            } else if (d.mode === 'trim_right') {
                const newTrimEnd = Math.max(d.startTrimStart + 0.05, Math.min(clip.durationSeconds, d.startTrimEnd + dSec));
                updateAudioClip(clip.deckIndex, { trimEndSec: newTrimEnd });
            }
        };
        const onUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [clip.deckIndex, clip.durationSeconds, frameWidth, fps, updateAudioClip]);

    const handleRemove = () => {
        audioAnalysisEngine.deactivateDeck(clip.deckIndex);
        clearAudioFile(clip.deckIndex);
        setAudioClip(clip.deckIndex, null);
    };

    return (
        <div className="flex border-b border-white/5 bg-transparent" style={{ height: STRIP_HEIGHT }}>
            <div
                className="sticky left-0 z-30 bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 group select-none"
                style={{ width: sidebarWidth }}
            >
                <span className="truncate text-[10px] font-bold text-purple-300" title={clip.fileName}>
                    {clip.fileName}
                </span>
                <button
                    onClick={handleRemove}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-0.5"
                    title="Remove audio clip"
                >
                    <CloseIcon />
                </button>
            </div>
            <div className="flex-1 relative overflow-visible">
                <div
                    className="absolute top-2 bg-purple-900/30 border border-purple-500/40 rounded cursor-grab active:cursor-grabbing overflow-hidden"
                    style={{ left: leftPx, width: Math.max(8, widthPx), height: STRIP_HEIGHT - 16 }}
                    onMouseDown={startDrag('move')}
                    title="Drag to move clip"
                >
                    {clip.peaks && clip.peaks.length > 0 ? (
                        <Waveform
                            peaks={clip.peaks}
                            widthPx={Math.max(8, widthPx)}
                            trimRange={[clip.trimStartSec, clip.trimEndSec]}
                            durationSec={clip.durationSeconds}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[9px] font-bold text-purple-300/70 tracking-wider animate-pulse">
                                Decoding…
                            </span>
                        </div>
                    )}
                    <div
                        className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize bg-purple-400/40 hover:bg-white/60"
                        onMouseDown={startDrag('trim_left')}
                        title="Trim start"
                    />
                    <div
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize bg-purple-400/40 hover:bg-white/60"
                        onMouseDown={startDrag('trim_right')}
                        title="Trim end"
                    />
                </div>
            </div>
        </div>
    );
};

export const AudioStrip = React.memo(AudioStripInner);

interface AudioGroupProps {
    frameWidth: number;
    sidebarWidth: number;
}

/** Container row + per-deck strips. Hidden entirely when no clips loaded — we
 *  surface the "+ Load" affordance only when at least one deck is empty. */
export const AudioGroup: React.FC<AudioGroupProps> = ({ frameWidth, sidebarWidth }) => {
    const audioClips = useAnimationStore(s => s.audioClips);
    const fps        = useAnimationStore(s => s.fps);

    const deck0 = audioClips[0];
    const deck1 = audioClips[1];
    const hasAny = !!deck0 || !!deck1;

    return (
        <>
            <div
                className="flex border-b border-white/5 bg-purple-950/40 sticky top-6 z-20"
                style={{ height: 24 }}
            >
                <div
                    className="sticky left-0 z-30 bg-purple-900/40 border-r border-white/10 shrink-0 flex items-center px-2 select-none"
                    style={{ width: sidebarWidth }}
                >
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Audio</span>
                </div>
                <div className="flex-1" />
            </div>
            {deck0
                ? <AudioStrip clip={deck0} frameWidth={frameWidth} sidebarWidth={sidebarWidth} fps={fps} />
                : (hasAny ? null : <EmptyDeckSlot deckIndex={0} sidebarWidth={sidebarWidth} />)}
            {deck1
                ? <AudioStrip clip={deck1} frameWidth={frameWidth} sidebarWidth={sidebarWidth} fps={fps} />
                : (deck0 ? <EmptyDeckSlot deckIndex={1} sidebarWidth={sidebarWidth} /> : null)}
        </>
    );
};
