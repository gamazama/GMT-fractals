// @engine/render-dialog — generic video-export dialog plugin.
//
// Apps install once with their app-specific runner; the plugin owns
// the UI (DraggableWindow chrome, ConfigForm, RenderingView), the
// flag/status state, the capability check, and disk-mode detection.
// The runner is invoked on Start with a deps bundle of cfg + extra +
// flags + status + isDiskMode and is responsible for the per-frame
// pump + encoder lifecycle.
//
//   installRenderDialog({
//     runner: async ({ cfg, flags, status, isDiskMode }) => {
//       // start encoder, loop frames, call status.* throughout, finalise
//     },
//     showSamplesPerFrame: false, // demo doesn't have TSAA
//   });
//
// App-specific UI extras go through `extraFormFields` (a React FC
// rendered below the standard form) and `extraInfoRows` (a row inside
// the summary block). App-gmt uses these for image-sequence /
// multi-pass / internal-scale / depth-range controls.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DraggableWindow from '../../../components/DraggableWindow';
import { useAnimationStore } from '../../../store/animationStore';
import { VIDEO_CONFIG } from '../../../data/constants';
import { canEncodeFormat } from '../../export/videoEncoder';
import { registerRenderPopup } from '../../animation/renderPopupRegistry';
import { ConfigForm } from './ConfigForm';
import { RenderingView } from './RenderingView';
import type {
    InstallRenderDialogOptions,
    RenderDialogConfig,
    RenderDialogFlags,
    RenderDialogStatus,
    RenderDialogDeps,
} from './types';

export type {
    RenderDialogConfig,
    RenderDialogFlags,
    RenderDialogStatus,
    RenderDialogDeps,
    RenderDialogRunner,
    RenderDialogExtraFieldsProps,
    RenderDialogResolutionPreset,
    RenderDialogStartContext,
    InstallRenderDialogOptions,
} from './types';

const BASE_WIDTH  = 320;
const BASE_HEIGHT = 460;

/**
 * @invariant Installs via `registerRenderPopup`, NOT topbar or menu —
 *   the Timeline toolbar's Render button reads `getRenderPopup()` and
 *   hides itself when nothing is registered.
 */
export const installRenderDialog = <TExtra = Record<string, unknown>>(
    options: InstallRenderDialogOptions<TExtra>,
): void => {
    const RenderDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
        <RenderDialogShell options={options} onClose={onClose} />
    );
    registerRenderPopup(RenderDialog);
};

// ─── Internals ────────────────────────────────────────────────────

interface ShellProps<TExtra> {
    options: InstallRenderDialogOptions<TExtra>;
    onClose: () => void;
}

function RenderDialogShell<TExtra>(
    { options, onClose }: ShellProps<TExtra>,
): React.ReactElement {
    const animStore = useAnimationStore();

    const showSamplesPerFrame = options.showSamplesPerFrame ?? true;
    const showFrameStep       = options.showFrameStep       ?? true;
    const showBitrate         = options.showBitrate         ?? true;
    const baseSize     = options.baseSize     ?? { width: BASE_WIDTH, height: BASE_HEIGHT };
    const expandedSize = options.expandedSize ?? baseSize;

    // ─── Form config ───────────────────────────────────────────────
    const [cfg, setCfgState] = useState<RenderDialogConfig>(() => ({
        width:           options.defaults?.width           ?? 1280,
        height:          options.defaults?.height          ?? 720,
        formatIndex:     options.defaults?.formatIndex     ?? 0,
        bitrate:         options.defaults?.bitrate         ?? VIDEO_CONFIG.DEFAULT_BITRATE,
        samplesPerFrame: options.defaults?.samplesPerFrame ?? VIDEO_CONFIG.DEFAULT_SAMPLES,
        startFrame:      options.defaults?.startFrame      ?? 0,
        endFrame:        options.defaults?.endFrame        ?? animStore.durationFrames,
        frameStep:       options.defaults?.frameStep       ?? 1,
        fps:             options.defaults?.fps             ?? animStore.fps,
    }));
    const setCfg = (patch: Partial<RenderDialogConfig>) => setCfgState((c) => ({ ...c, ...patch }));

    // ─── Extra config (app-specific bag) ───────────────────────────
    const [extra, setExtraState] = useState<TExtra>(
        () => ((options.defaults?.extra ?? {}) as TExtra),
    );
    const patchExtra = (patch: Partial<TExtra>) =>
        setExtraState((e) => ({ ...e, ...patch }));

    // Auto-track fps from the animation store — cfg.fps is mutable
    // through the form for apps that want it, but defaults to the
    // current store value and follows it until the user touches the
    // dialog.
    useEffect(() => {
        if (options.defaults?.fps !== undefined) return;
        setCfgState((c) => (c.fps === animStore.fps ? c : { ...c, fps: animStore.fps }));
    }, [animStore.fps, options.defaults?.fps]);

    // Auto-recommend bitrate on resolution change (40 Mbps @ 1080p,
    // scale linearly). Apps that override `defaults.bitrate` keep
    // their default until the user resizes — same behaviour as
    // fluid-toy / app-gmt.
    //
    // @invariant Bitrate auto-recommend overwrites user input on every
    //   `cfg.width`/`cfg.height` change — `Math.round(40 * (w*h) /
    //   (1920*1080))` Mbps. A user edit to bitrate survives only until
    //   the next resolution edit.
    useEffect(() => {
        const target = cfg.width * cfg.height;
        const ref    = 1920 * 1080;
        setCfgState((c) => ({ ...c, bitrate: Math.max(1, Math.round(40 * (target / ref))) }));
    }, [cfg.width, cfg.height]);

    // ─── Run-time state ────────────────────────────────────────────
    const [progress, setProgress]               = useState(0);  // 0..100 (percent)
    const [statusText, setStatusText]           = useState('');
    const [isRendering, setIsRendering]         = useState(false);
    const [isStopping, setIsStopping]           = useState(false);
    const [elapsedTime, setElapsedTime]         = useState(0);
    const [etaRange, setEtaRange]               = useState({ min: 0, max: 0 });
    const [lastFrameTime, setLastFrameTime]     = useState(0);

    const stoppingRef    = useRef(false);
    const cancelledRef   = useRef(false);
    const finishEarlyRef = useRef(false);
    const startTimeRef   = useRef(0);

    // ─── Capability checks ─────────────────────────────────────────
    const [isDiskMode, setIsDiskMode]                 = useState(false);
    const [isFormatSupported, setIsFormatSupported]   = useState(true);
    const [formatSupportError, setFormatSupportError] = useState<string | null>(null);

    useEffect(() => {
        if (options.disableDiskMode) { setIsDiskMode(false); return; }
        setIsDiskMode(typeof window !== 'undefined' && 'showSaveFilePicker' in window);
    }, []);

    const canEncode = options.canEncode ?? canEncodeFormat;
    useEffect(() => {
        let stale = false;
        canEncode(cfg.formatIndex, cfg.width, cfg.height, cfg.bitrate).then((res) => {
            if (stale) return;
            setIsFormatSupported(res.ok);
            setFormatSupportError(res.ok ? null : (res.reason ?? null));
        });
        return () => { stale = true; };
    }, [cfg.formatIndex, cfg.width, cfg.height, cfg.bitrate]);

    // ─── Window position / size ────────────────────────────────────
    const [winPos, setWinPos] = useState(() => {
        const padding = 20;
        const x = Math.max(20, window.innerWidth - baseSize.width - 320 - padding);
        return { x, y: 80 };
    });
    const [winSize, setWinSize] = useState(baseSize);
    useEffect(() => {
        setWinSize(isRendering ? expandedSize : baseSize);
    }, [isRendering, baseSize.width, baseSize.height, expandedSize.width, expandedSize.height]);

    // ─── Lifecycle hooks ───────────────────────────────────────────
    useEffect(() => {
        if (useAnimationStore.getState().isPlaying) useAnimationStore.getState().pause();
    }, []);

    useEffect(() => {
        if (!options.onMount) return;
        return options.onMount() || undefined;
    }, []);

    // ─── Stop / resume / finish-early / discard ────────────────────
    const handleStop          = () => { stoppingRef.current = true;    setIsStopping(true); };
    const handleResume        = () => { stoppingRef.current = false;   setIsStopping(false); };
    const handleConfirmStitch = () => {
        stoppingRef.current = false;
        finishEarlyRef.current = true;
        setStatusText('Finishing early…');
    };
    const handleDiscard       = () => {
        stoppingRef.current  = false;
        cancelledRef.current = true;
    };

    // ─── Start ─────────────────────────────────────────────────────
    const handleStart = () => {
        cancelledRef.current   = false;
        finishEarlyRef.current = false;
        stoppingRef.current    = false;
        startTimeRef.current   = Date.now();
        setIsStopping(false);

        const flags: RenderDialogFlags = { cancelledRef, finishEarlyRef, stoppingRef, startTimeRef };
        const status: RenderDialogStatus = {
            // Adapter — runners think in 0..1, UI shows 0..100. Letting
            // runners speak fractions matches how progress reads naturally
            // (`done / total`) and frees them from the percent quirk.
            setProgress:      (n: number) => setProgress(Math.max(0, Math.min(100, n * 100))),
            setElapsedTime,
            setEtaRange,
            setLastFrameTime,
            setStatusText,
            setIsRendering,
            setIsStopping,
        };
        const deps: RenderDialogDeps<TExtra> = { cfg, extra, flags, status, isDiskMode };
        options.runner(deps);
    };

    // ─── Render ────────────────────────────────────────────────────
    const title = options.title ?? 'Render Video';

    return (
        <DraggableWindow
            title={isRendering ? 'Rendering…' : title}
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
                    onStop={handleStop}
                    onResume={handleResume}
                    onConfirmStitch={handleConfirmStitch}
                    onDiscard={handleDiscard}
                    progress={progress}
                    statusText={statusText}
                    elapsedTime={elapsedTime}
                    etaRange={etaRange}
                    lastFrameTime={lastFrameTime}
                    isStopping={isStopping}
                    cfg={cfg}
                    showSamplesPerFrame={showSamplesPerFrame}
                />
            ) : (
                <ConfigForm
                    cfg={cfg}
                    setCfg={setCfg}
                    extra={extra}
                    patchExtra={patchExtra}
                    durationFrames={animStore.durationFrames}
                    isFormatSupported={isFormatSupported}
                    formatSupportError={formatSupportError}
                    isDiskMode={isDiskMode}
                    showSamplesPerFrame={showSamplesPerFrame}
                    showFrameStep={showFrameStep}
                    showBitrate={showBitrate}
                    formatFilter={options.formatFilter}
                    resolutionPresets={options.resolutionPresets}
                    ExtraFormFields={options.extraFormFields}
                    ExtraInfoRows={options.extraInfoRows}
                    ExtraWarning={options.extraWarning}
                    startLabel={options.startLabel}
                    isStartDisabled={options.isStartDisabled}
                    onStart={handleStart}
                />
            )}
        </DraggableWindow>
    );
}
