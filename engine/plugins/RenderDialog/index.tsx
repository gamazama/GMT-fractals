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
//
// THREE OPT-INS added 2026-10-11, each off unless asked for (an app
// that passes none of them gets the dialog as it always was):
//   - `frameFolder`: for a runner that makes every frame itself. The
//     format "PNG sequence (folder)" and one Cancel button during the
//     run. The frames go through `engine/export/frameFolder.ts`; the
//     RUNNER asks for the folder, and looks into it.
//   - `fixedSizes`: the size is one of the presets, nothing typed.
//   - `status.setResult(...)`: what to show when the run has ended (a
//     few lines, a command with a Copy button) instead of the form.
// And `defaults` may be a function, called each time the dialog opens.
// A fourth the same day: `presets`, a row of named buttons that patch
// the form (a "Draft": small and one sample). And an app that opts into
// `frameFolder` WITHOUT a `formatFilter` lists the video formats beside
// the folder: its runner then serves both, and the dialog is the folder
// dialog or the video dialog by the format selected (no bitrate and no
// encoder probe for the folder).
// A QUESTION, since stage R6c the same day: `status.ask({ lines,
// options, cancel })` shows a few lines and a button an option in place
// of the form or the progress (QuestionView.tsx) and resolves with the
// option chosen - or with `cancel` when the dialog is closed under it.
// The words are the runner's; the dialog knows nothing of what is asked.
// (Its first user: a runner that finds frames of its render already in
// the folder asks what to do with them.) Nobody asks, nothing changes.
// The dialog can also be opened from outside the timeline toolbar:
// `openRenderPopup()` in engine/animation/renderPopupRegistry.ts.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DraggableWindow from '../../../components/DraggableWindow';
import { z } from '../../../components/ui';
import { useAnimationStore } from '../../../store/animationStore';
import { VIDEO_CONFIG } from '../../../data/constants';
import { canEncodeFormat } from '../../export/videoEncoder';
import { FRAME_FOLDER_UNSUPPORTED, canPickFrameFolder } from '../../export/frameFolder';
import { registerRenderPopup } from '../../animation/renderPopupRegistry';
import { ConfigForm, isFrameFolderFormat } from './ConfigForm';
import { RenderingView } from './RenderingView';
import { ResultView } from './ResultView';
import { QuestionView } from './QuestionView';
import type {
    InstallRenderDialogOptions,
    RenderDialogConfig,
    RenderDialogFlags,
    RenderDialogStatus,
    RenderDialogDeps,
    RenderDialogQuestion,
    RenderDialogResult,
} from './types';

export { FRAME_FOLDER_FORMAT_INDEX } from './ConfigForm';
export type {
    RenderDialogConfig,
    RenderDialogFlags,
    RenderDialogStatus,
    RenderDialogDeps,
    RenderDialogRunner,
    RenderDialogQuestion,
    RenderDialogResult,
    RenderDialogExtraFieldsProps,
    RenderDialogPreset,
    RenderDialogResolutionPreset,
    RenderDialogStartContext,
    InstallRenderDialogOptions,
} from './types';

const BASE_WIDTH  = 320;
const BASE_HEIGHT = 460;

/**
 * @assumption Installs via `registerRenderPopup`, NOT topbar or menu —
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
    // Defaults as an object, or a function asked once per open dialog.
    const defaults = useMemo(
        () => (typeof options.defaults === 'function' ? options.defaults() : options.defaults),
        [],
    );
    const [cfg, setCfgState] = useState<RenderDialogConfig>(() => ({
        width:           defaults?.width           ?? 1280,
        height:          defaults?.height          ?? 720,
        formatIndex:     defaults?.formatIndex     ?? 0,
        bitrate:         defaults?.bitrate         ?? VIDEO_CONFIG.DEFAULT_BITRATE,
        samplesPerFrame: defaults?.samplesPerFrame ?? VIDEO_CONFIG.DEFAULT_SAMPLES,
        startFrame:      defaults?.startFrame      ?? 0,
        endFrame:        defaults?.endFrame        ?? animStore.durationFrames,
        frameStep:       defaults?.frameStep       ?? 1,
        fps:             defaults?.fps             ?? animStore.fps,
    }));
    const setCfg = (patch: Partial<RenderDialogConfig>) => setCfgState((c) => ({ ...c, ...patch }));

    // ─── Extra config (app-specific bag) ───────────────────────────
    const [extra, setExtraState] = useState<TExtra>(
        () => ((defaults?.extra ?? {}) as TExtra),
    );
    const patchExtra = (patch: Partial<TExtra>) =>
        setExtraState((e) => ({ ...e, ...patch }));

    // Re-clamp the frame range when the timeline duration changes. The
    // dialog is a non-modal DraggableWindow, so the user can shrink the
    // timeline's LEN while it's open; without this, a stale endFrame
    // (e.g. 300) stays above the new max (e.g. 100) until the End field
    // is touched, and the render would emit frames past the timeline.
    // Only shrinks — growing the duration leaves the range for the user
    // to extend. Also catches an out-of-range `defaults.endFrame`.
    useEffect(() => {
        setCfgState((c) => {
            const endFrame   = Math.min(c.endFrame, animStore.durationFrames);
            const startFrame = Math.min(c.startFrame, endFrame);
            return (endFrame === c.endFrame && startFrame === c.startFrame)
                ? c
                : { ...c, endFrame, startFrame };
        });
    }, [animStore.durationFrames]);

    // Auto-track fps from the animation store — cfg.fps is mutable
    // through the form for apps that want it, but defaults to the
    // current store value and follows it until the user touches the
    // dialog.
    useEffect(() => {
        if (defaults?.fps !== undefined) return;
        setCfgState((c) => (c.fps === animStore.fps ? c : { ...c, fps: animStore.fps }));
    }, [animStore.fps, defaults?.fps]);

    // `fixedSizes`: the size is always one of the presets. The list may be a function of
    // live state (the shape of the app's picture), so it is asked again after every render;
    // a size no longer in it snaps to the preset with the nearest long edge.
    useEffect(() => {
        if (!options.fixedSizes) return;
        const presets = typeof options.resolutionPresets === 'function' ? options.resolutionPresets() : options.resolutionPresets;
        if (!presets?.length || presets.some((p) => p.w === cfg.width && p.h === cfg.height)) return;
        const long = Math.max(cfg.width, cfg.height), off = (p: { w: number; h: number }) => Math.abs(Math.max(p.w, p.h) - long);
        const nearest = presets.reduce((a, b) => (off(b) < off(a) ? b : a));
        setCfg({ width: nearest.w, height: nearest.h });
    });

    // Auto-recommend bitrate on resolution change (40 Mbps @ 1080p,
    // scale linearly). Apps that override `defaults.bitrate` keep
    // their default until the user resizes — same behaviour as
    // fluid-toy / app-gmt.
    //
    // @assumption Bitrate auto-recommend overwrites user input on every
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

    // `frameFolder`: the folder format is the one selected. It needs no encoder: it is there
    // exactly where the browser can write into a folder.
    const folderFormat = !!options.frameFolder && isFrameFolderFormat(cfg.formatIndex);
    const [result, setResult] = useState<RenderDialogResult | null>(null);

    // ─── A question from the runner (`status.ask`) ─────────────────
    // One at a time. The ref holds the open one's promise, so that it can be
    // settled from a button and - with its `cancel` - when the dialog goes
    // away under it: a runner must never be left waiting on a closed dialog.
    const [question, setQuestion] = useState<RenderDialogQuestion | null>(null);
    const openQuestion = useRef<{ cancel: string; resolve: (id: string) => void } | null>(null);
    const answer = (id: string) => {
        const open = openQuestion.current;
        openQuestion.current = null;
        setQuestion(null);
        open?.resolve(id);
    };
    const ask = (asked: RenderDialogQuestion): Promise<string> => new Promise((resolve) => {
        if (openQuestion.current) answer(openQuestion.current.cancel);   // asked again before the first was answered
        openQuestion.current = { cancel: asked.cancel, resolve };
        setQuestion(asked);
    });
    useEffect(() => () => {
        const open = openQuestion.current;
        openQuestion.current = null;
        open?.resolve(open.cancel);
    }, []);

    const canEncode = options.canEncode ?? canEncodeFormat;
    useEffect(() => {
        if (folderFormat) {
            const ok = canPickFrameFolder();
            setIsFormatSupported(ok);
            setFormatSupportError(ok ? null : FRAME_FOLDER_UNSUPPORTED);
            return;
        }
        let stale = false;
        canEncode(cfg.formatIndex, cfg.width, cfg.height, cfg.bitrate).then((res) => {
            if (stale) return;
            setIsFormatSupported(res.ok);
            setFormatSupportError(res.ok ? null : (res.reason ?? null));
        });
        return () => { stale = true; };
    }, [folderFormat, cfg.formatIndex, cfg.width, cfg.height, cfg.bitrate]);

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
        setResult(null);

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
            setResult,
            ask,
        };
        const deps: RenderDialogDeps<TExtra> = { cfg, extra, flags, status, isDiskMode };
        options.runner(deps);
    };

    // ─── Render ────────────────────────────────────────────────────
    const title = options.title ?? 'Render Video';

    return (
        <DraggableWindow
            title={isRendering && !question ? 'Rendering…' : title}
            onClose={onClose}
            position={winPos}
            onPositionChange={setWinPos}
            size={winSize}
            onSizeChange={setWinSize}
            disableClose={isRendering && !question}
            zIndex={z('tool')}
        >
            {question ? (
                <QuestionView question={question} onAnswer={answer} />
            ) : isRendering ? (
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
                    plain={folderFormat}
                />
            ) : result ? (
                <ResultView result={result} onBack={() => setResult(null)} />
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
                    frameFolder={!!options.frameFolder}
                    fixedSizes={!!options.fixedSizes}
                    formPresets={options.presets}
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
