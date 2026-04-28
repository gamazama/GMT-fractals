/**
 * RenderPopup — modal export dialog. Two view modes:
 *   - ConfigView: pre-render settings + Start button.
 *   - RenderingView: live progress + stop / resume / finish-early controls.
 *
 * The imperative export pipelines (encoder setup, frame loop, abort,
 * finalize) live in `RenderPopup/exportRunner.ts`. The two JSX modes
 * live in `ConfigView.tsx` and `RenderingView.tsx`. This file is
 * state + effects + dispatch.
 */

import React, { useState, useRef, useEffect } from 'react';
import { getProxy } from '../../engine/worker/WorkerProxy';
import { useAnimationStore } from '../../../store/animationStore';
import { useEngineStore, getCanvasPhysicalPixelSize } from '../../../store/engineStore';
import { VIDEO_FORMATS, VIDEO_CONFIG } from '../../../data/constants';
import * as Mediabunny from 'mediabunny';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { runVideoExport } from './RenderPopup/exportRunner';
import { ConfigView } from './RenderPopup/ConfigView';
import { RenderingView } from './RenderPopup/RenderingView';
import type { ExportFlags, ExportFormConfig, ExportRunStatus, PopupSizing } from './RenderPopup/types';

const engine = getProxy();

interface RenderPopupProps {
    onClose: () => void;
}

const BASE_WIDTH = 320;
const EXPANDED_WIDTH = 400;
const BASE_HEIGHT = 450;

export const RenderPopup: React.FC<RenderPopupProps> = ({ onClose }) => {
    const animStore = useAnimationStore();
    // Full-store subscription — re-render on canvasPixelSize changes so the
    // render-time estimator stays fresh. Actual canvas size read via
    // getCanvasPhysicalPixelSize below.
    const { resolutionMode, fixedResolution } = useEngineStore();

    // Form state
    const [vidRes, setVidRes] = useState<{w: number; h: number}>(() => {
        if (resolutionMode === 'Fixed') {
            return { w: fixedResolution[0], h: fixedResolution[1] };
        }
        return { w: 1280, h: 720 };
    });
    const [formatIndex, setFormatIndex]   = useState(0);
    const [vidSamples, setVidSamples]     = useState(16);
    const [vidBitrate, setVidBitrate]     = useState(VIDEO_CONFIG.DEFAULT_BITRATE);
    const [startFrame, setStartFrame]     = useState(0);
    const [endFrame, setEndFrame]         = useState(animStore.durationFrames);
    const [frameStep, setFrameStep]       = useState(1);
    const [internalScale, setInternalScale] = useState(1.0);
    const [exportBeauty, setExportBeauty] = useState(true);
    const [exportAlpha, setExportAlpha]   = useState(false);
    const [exportDepth, setExportDepth]   = useState(false);
    // Depth-pass normalization range (world units). Defaults match the
    // atmosphere feature's default fog start/end.
    const [depthMin, setDepthMin]         = useState(0);
    const [depthMax, setDepthMax]         = useState(5);

    // Auto-recommend bitrate on resolution change (40 Mbps @ 1080p, scale linearly).
    useEffect(() => {
        const pixels1080p = 1920 * 1080;
        const targetPixels = vidRes.w * vidRes.h;
        const baseBitrate = 40;
        setVidBitrate(Math.round(baseBitrate * (targetPixels / pixels1080p)));
    }, [vidRes]);

    // Render-runtime state
    const [progress, setProgress]         = useState(0);
    const [statusText, setStatusText]     = useState('');
    const [isRendering, setIsRendering]   = useState(false);
    const [isStopping, setIsStopping]     = useState(false);
    const stoppingRef    = useRef(false);
    const cancelledRef   = useRef(false);
    const finishEarlyRef = useRef(false);
    const startTimeRef   = useRef<number>(0);
    const [elapsedTime, setElapsedTime]     = useState(0);
    const [etaRange, setEtaRange]           = useState({ min: 0, max: 0 });
    const [lastFrameTime, setLastFrameTime] = useState(0);

    // Preview stats from the live pipeline (pre-render only).
    const [frameStats, setFrameStats] = useState({ duration: 0, progress: 0 });

    // Environment + capability checks
    const [isDiskMode, setIsDiskMode]               = useState(false);
    const [isFormatSupported, setIsFormatSupported] = useState(true);

    const fps = animStore.fps;
    const currentFormat = VIDEO_FORMATS[formatIndex];

    // Firefox uses Cisco's OpenH264 binary for AVC encoding, which is built
    // with an H.264 Level 4.0 cap (≈31 Mbps MaxBR for High profile) regardless
    // of the level we request. The encoder request is `bitrate * 2.5e6` (see
    // WorkerExporter), so the slider trips it above ~12.
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
    const isFirefoxH264BitrateCapped = isFirefox && currentFormat.codec === 'avc' && vidBitrate > 12;

    // Resolution presets — built lazily so the screen size is current.
    const resOptions = [
        ...(resolutionMode === 'Fixed' ? [{ label: `Viewport (${fixedResolution[0]}x${fixedResolution[1]})`, value: `${fixedResolution[0]}x${fixedResolution[1]}` }] : []),
        { label: `Screen (${window.innerWidth}x${window.innerHeight})`, value: `${window.innerWidth}x${window.innerHeight}` },
        { label: '720p HD (16:9)',       value: '1280x720'  },
        { label: '1080p FHD (16:9)',     value: '1920x1080' },
        { label: '1440p QHD (16:9)',     value: '2560x1440' },
        { label: '4K UHD (16:9)',        value: '3840x2160' },
        { label: 'Square 1:1 (Insta)',   value: '1080x1080' },
        { label: 'Portrait 4:5 (Insta)', value: '1080x1350' },
        { label: 'Vertical 9:16 (TikTok/Reels)', value: '1080x1920' },
    ];

    // Window position — anchored to the right side of the viewport.
    const [winPos, setWinPos] = useState(() => {
        const controlsWidth = 320;
        const padding = 20;
        const x = Math.max(20, window.innerWidth - controlsWidth - 320 - padding);
        return { x, y: 80 };
    });
    const [winSize, setWinSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

    // Suppress adaptive resolution while the panel is open.
    useEffect(() => {
        useEngineStore.getState().setAdaptiveSuppressed(true);
        return () => { useEngineStore.getState().setAdaptiveSuppressed(false); };
    }, []);

    // Disk-mode capability + viewport sample-time poll (drives the estimator).
    useEffect(() => {
        setIsDiskMode(typeof window !== 'undefined' && 'showSaveFilePicker' in window);
        engine.setPreviewSampleCap(vidSamples);

        let sampleStartTime = Date.now();
        let lastCount = 0;
        let measuredDuration = 0;

        const pollInterval = setInterval(() => {
            if (isRendering) return;
            const count = engine.accumulationCount;
            const currentProgress = Math.min(1.0, count / vidSamples);
            // Detect accumulation restart.
            if (count < lastCount) {
                sampleStartTime = Date.now();
                measuredDuration = 0;
            }
            if (count >= vidSamples && measuredDuration === 0) {
                measuredDuration = Date.now() - sampleStartTime;
            }
            lastCount = count;
            setFrameStats({ duration: measuredDuration, progress: currentProgress });
        }, 30);

        return () => {
            engine.setPreviewSampleCap(0);
            clearInterval(pollInterval);
        };
    }, [vidSamples, isRendering]);

    // Listen for progress updates from the worker (re-purposes BUCKET_STATUS).
    useEffect(() => {
        const totalFrames = Math.floor((endFrame - startFrame) / frameStep) + 1;
        let lastFrameEnd = Date.now();

        return FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
            if (!data.isRendering) {
                setIsRendering(false);
                setWinSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
                return;
            }
            setProgress(data.progress);
            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;
            setElapsedTime(elapsed);
            if (data.progress > 0) {
                const framesDone = (data.progress / 100) * totalFrames;
                if (framesDone >= 1 && framesDone % 1 < 0.1) {
                    const thisFrameTime = (now - lastFrameEnd) / 1000;
                    setLastFrameTime(thisFrameTime);
                    lastFrameEnd = now;
                }
                const eta = (totalFrames - framesDone) * (elapsed / framesDone);
                setEtaRange({ min: eta * 0.9, max: eta * 1.1 });
            }
        });
    }, [startFrame, endFrame, frameStep]);

    // Format support check via mediabunny.
    useEffect(() => {
        const checkSupport = async () => {
            // Image sequences encode PNG/JPG in the worker via OffscreenCanvas
            // — capability gate is the FSA directory picker, surfaced separately.
            if (currentFormat.imageSequence) { setIsFormatSupported(true); return; }
            if (typeof VideoEncoder === 'undefined') { setIsFormatSupported(false); return; }
            try {
                const safeWidth  = vidRes.w % 2 === 0 ? vidRes.w : vidRes.w - 1;
                const safeHeight = vidRes.h % 2 === 0 ? vidRes.h : vidRes.h - 1;
                const supported = await Mediabunny.canEncodeVideo(currentFormat.codec as any, {
                    width: safeWidth, height: safeHeight,
                    bitrate: vidBitrate * 1_000_000,
                });
                setIsFormatSupported(supported);
            } catch (e) {
                console.warn('Format check failed:', e);
                setIsFormatSupported(false);
            }
        };
        checkSupport();
    }, [formatIndex, vidRes, vidBitrate, fps]);

    // Pause / resume / finish-early / discard during a render.
    const handleStopClick    = () => { stoppingRef.current = true;    setIsStopping(true); };
    const handleResume       = () => { stoppingRef.current = false;   setIsStopping(false); };
    const confirmStitch      = () => { stoppingRef.current = false;   setStatusText('Finalizing...'); finishEarlyRef.current = true; };
    const discardRender      = () => { stoppingRef.current = false;   cancelledRef.current = true; };

    // Estimated total — viewport sample × resolution-pixel ratio × frame count.
    const totalFramesCount = Math.floor((endFrame - startFrame) / frameStep) + 1;
    const calculateEstimatedTotal = () => {
        if (!frameStats.duration) return 0;
        const [viewportW, viewportH] = getCanvasPhysicalPixelSize(useEngineStore.getState());
        const viewportPixels = viewportW * viewportH;
        const targetPixels = (vidRes.w * internalScale) * (vidRes.h * internalScale);
        const multiplier = viewportPixels > 0 ? targetPixels / viewportPixels : 1;
        const singleFrameEst = (frameStats.duration / 1000) * multiplier;
        return singleFrameEst * totalFramesCount;
    };
    const estTotalSeconds = calculateEstimatedTotal();
    const diskModeTooltip = isDiskMode
        ? 'Direct Disk Write (Stream)'
        : 'RAM Buffer: Browser may crash if video exceeds ~2GB. Use Chrome for Disk Mode.';

    // Bundle deps for the runner and dispatch.
    const handleStart = () => {
        const cfg: ExportFormConfig = {
            vidRes, formatIndex, vidSamples, vidBitrate,
            startFrame, endFrame, frameStep, internalScale,
            depthMin, depthMax, exportBeauty, exportAlpha, exportDepth,
            fps,
        };
        const flags: ExportFlags = { cancelledRef, finishEarlyRef, stoppingRef, startTimeRef };
        const status: ExportRunStatus = {
            setProgress, setElapsedTime, setEtaRange, setLastFrameTime,
            setStatusText, setIsRendering, setIsStopping,
        };
        const sizing: PopupSizing = { setWinSize, BASE_WIDTH, BASE_HEIGHT, EXPANDED_WIDTH };
        runVideoExport({ cfg, flags, status, sizing, isDiskMode });
    };

    if (isRendering) {
        return (
            <RenderingView
                onClose={onClose}
                onStop={handleStopClick}
                onResume={handleResume}
                onConfirmStitch={confirmStitch}
                onDiscard={discardRender}
                progress={progress} statusText={statusText}
                elapsedTime={elapsedTime} etaRange={etaRange} lastFrameTime={lastFrameTime}
                isStopping={isStopping}
                vidRes={vidRes} formatIndex={formatIndex}
                vidSamples={vidSamples} internalScale={internalScale}
                winPos={winPos} setWinPos={setWinPos}
                winSize={winSize} setWinSize={setWinSize}
            />
        );
    }

    return (
        <ConfigView
            onClose={onClose}
            onStart={handleStart}
            vidRes={vidRes} setVidRes={setVidRes}
            formatIndex={formatIndex} setFormatIndex={setFormatIndex}
            vidSamples={vidSamples} setVidSamples={setVidSamples}
            vidBitrate={vidBitrate} setVidBitrate={setVidBitrate}
            startFrame={startFrame} setStartFrame={setStartFrame}
            endFrame={endFrame} setEndFrame={setEndFrame}
            frameStep={frameStep} setFrameStep={setFrameStep}
            internalScale={internalScale} setInternalScale={setInternalScale}
            exportBeauty={exportBeauty} setExportBeauty={setExportBeauty}
            exportAlpha={exportAlpha} setExportAlpha={setExportAlpha}
            exportDepth={exportDepth} setExportDepth={setExportDepth}
            depthMin={depthMin} setDepthMin={setDepthMin}
            depthMax={depthMax} setDepthMax={setDepthMax}
            fps={fps}
            durationFrames={animStore.durationFrames}
            isFormatSupported={isFormatSupported}
            isFirefoxH264BitrateCapped={isFirefoxH264BitrateCapped}
            isDiskMode={isDiskMode}
            diskModeTooltip={diskModeTooltip}
            frameStats={frameStats}
            estTotalSeconds={estTotalSeconds}
            resOptions={resOptions}
            winPos={winPos} setWinPos={setWinPos}
            winSize={winSize} setWinSize={setWinSize}
        />
    );
};
