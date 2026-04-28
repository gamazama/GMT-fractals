/**
 * RenderDialog — fluid-toy's video export dialog. Two view modes:
 *   - ConfigForm: pre-render settings + Start button.
 *   - RenderingView: live progress + stop / resume / finish-early controls.
 *
 * The deterministic frame loop + encoder lifecycle live in
 * `./exportRunner.ts`. This file is state + effects + dispatch + the
 * DraggableWindow chrome.
 *
 * Mounted by `registerRenderPopup(RenderDialog)` so the shared timeline
 * toolbar's "Render" button surfaces it. The component receives an
 * `onClose` prop from the toolbar — same contract engine-gmt uses.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DraggableWindow from '../../../components/DraggableWindow';
import { useAnimationStore } from '../../../store/animationStore';
import { useEngineStore } from '../../../store/engineStore';
import { VIDEO_CONFIG } from '../../../data/constants';
import { canEncodeFormat } from '../../../engine/export/videoEncoder';
import { appEngine } from '../../engineHandles';
import { runVideoExport } from './exportRunner';
import { ConfigForm } from './ConfigForm';
import { RenderingView } from './RenderingView';
import type { RenderFlags, RenderFormConfig, RenderRunDeps, RenderRunStatus } from './types';

const BASE_WIDTH  = 320;
const BASE_HEIGHT = 460;

interface RenderDialogProps {
    onClose: () => void;
}

export const RenderDialog: React.FC<RenderDialogProps> = ({ onClose }) => {
    const animStore = useAnimationStore();

    // ─── Form state ────────────────────────────────────────────────
    const [width, setWidth]                     = useState(1280);
    const [height, setHeight]                   = useState(720);
    const [formatIndex, setFormatIndex]         = useState(0);
    const [samplesPerFrame, setSamplesPerFrame] = useState(32);
    const [bitrate, setBitrate]                 = useState(VIDEO_CONFIG.DEFAULT_BITRATE);
    const [startFrame, setStartFrame]           = useState(0);
    const [endFrame, setEndFrame]               = useState(animStore.durationFrames);
    const [frameStep, setFrameStep]             = useState(1);

    // Auto-recommend bitrate when resolution changes (40 Mbps @ 1080p, scale linearly).
    useEffect(() => {
        const target = width * height;
        const ref    = 1920 * 1080;
        setBitrate(Math.max(1, Math.round(40 * (target / ref))));
    }, [width, height]);

    // ─── Run-time state ─────────────────────────────────────────────
    const [progress, setProgress]           = useState(0);
    const [statusText, setStatusText]       = useState('');
    const [isRendering, setIsRendering]     = useState(false);
    const [isStopping, setIsStopping]       = useState(false);
    const [elapsedTime, setElapsedTime]     = useState(0);
    const [etaRange, setEtaRange]           = useState({ min: 0, max: 0 });
    const [lastFrameTime, setLastFrameTime] = useState(0);

    const stoppingRef    = useRef(false);
    const cancelledRef   = useRef(false);
    const finishEarlyRef = useRef(false);
    const startTimeRef   = useRef(0);

    // ─── Capability checks ─────────────────────────────────────────
    const [isDiskMode, setIsDiskMode]               = useState(false);
    const [isFormatSupported, setIsFormatSupported] = useState(true);
    const [formatSupportError, setFormatSupportError] = useState<string | null>(null);

    useEffect(() => {
        setIsDiskMode(typeof window !== 'undefined' && 'showSaveFilePicker' in window);
    }, []);

    useEffect(() => {
        let stale = false;
        canEncodeFormat(formatIndex, width, height, bitrate).then((res) => {
            if (stale) return;
            setIsFormatSupported(res.ok);
            setFormatSupportError(res.ok ? null : (res.reason ?? null));
        });
        return () => { stale = true; };
    }, [formatIndex, width, height, bitrate]);

    // ─── Window position ───────────────────────────────────────────
    const [winPos, setWinPos] = useState(() => {
        const padding = 20;
        const x = Math.max(20, window.innerWidth - BASE_WIDTH - 320 - padding);
        return { x, y: 80 };
    });
    const [winSize, setWinSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

    // Pause the timeline on mount so a playback loop isn't competing with
    // the user as they tune settings. Export pauses + restores anyway; this
    // is for the dialog-open-but-not-yet-rendering window. Not auto-resumed
    // on close — wherever the user landed is wherever they want to be.
    useEffect(() => {
        if (useAnimationStore.getState().isPlaying) useAnimationStore.getState().pause();
    }, []);

    // ─── Stop / resume / finish-early / discard handlers ───────────
    const handleStopClick   = () => { stoppingRef.current = true;  setIsStopping(true); };
    const handleResume      = () => { stoppingRef.current = false; setIsStopping(false); };
    const handleConfirmStitch = () => {
        stoppingRef.current = false;
        finishEarlyRef.current = true;
        setStatusText('Finishing early…');
    };
    const handleDiscard     = () => {
        stoppingRef.current  = false;
        cancelledRef.current = true;
    };

    const cfg = useMemo<RenderFormConfig>(() => ({
        width, height, formatIndex, samplesPerFrame, bitrate,
        startFrame, endFrame, frameStep, fps: animStore.fps,
    }), [width, height, formatIndex, samplesPerFrame, bitrate, startFrame, endFrame, frameStep, animStore.fps]);

    const handleStart = () => {
        const flags: RenderFlags = { cancelledRef, finishEarlyRef, stoppingRef, startTimeRef };
        const status: RenderRunStatus = {
            setProgress, setElapsedTime, setEtaRange, setLastFrameTime,
            setStatusText, setIsRendering, setIsStopping,
        };
        const deps: RenderRunDeps = {
            cfg, flags, status, isDiskMode,
            getEngine: () => appEngine.ref.current,
            getCanvas: () => document.querySelector('canvas'),
        };
        runVideoExport(deps);
    };

    return (
        <DraggableWindow
            title={isRendering ? 'Rendering…' : 'Render Video'}
            onClose={onClose}
            position={winPos}
            onPositionChange={setWinPos}
            size={winSize}
            onSizeChange={setWinSize}
            disableClose={isRendering}
            zIndex={600}
        >
            {isRendering ? (
                <RenderingView
                    onStop={handleStopClick}
                    onResume={handleResume}
                    onConfirmStitch={handleConfirmStitch}
                    onDiscard={handleDiscard}
                    progress={progress}
                    statusText={statusText}
                    elapsedTime={elapsedTime}
                    etaRange={etaRange}
                    lastFrameTime={lastFrameTime}
                    isStopping={isStopping}
                    width={width} height={height}
                    formatIndex={formatIndex}
                    samplesPerFrame={samplesPerFrame}
                />
            ) : (
                <ConfigForm
                    onStart={handleStart}
                    width={width} setWidth={setWidth}
                    height={height} setHeight={setHeight}
                    formatIndex={formatIndex} setFormatIndex={setFormatIndex}
                    samplesPerFrame={samplesPerFrame} setSamplesPerFrame={setSamplesPerFrame}
                    bitrate={bitrate} setBitrate={setBitrate}
                    startFrame={startFrame} setStartFrame={setStartFrame}
                    endFrame={endFrame} setEndFrame={setEndFrame}
                    frameStep={frameStep} setFrameStep={setFrameStep}
                    fps={animStore.fps}
                    durationFrames={animStore.durationFrames}
                    isFormatSupported={isFormatSupported}
                    formatSupportError={formatSupportError}
                    isDiskMode={isDiskMode}
                />
            )}
        </DraggableWindow>
    );
};

export default RenderDialog;
