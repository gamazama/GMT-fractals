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
// OPT-INS added 2026-10-11, each off unless asked for (an app that
// passes none of them gets the dialog as it always was; two more of
// that day, `fixedSizes` and `presets`, went on 2026-10-17, below):
//   - `frameFolder`: for a runner that makes every frame itself. The
//     formats "Frames (PNG folder)" and (since 2026-10-17) "Frames (JPG
//     folder)", and one Cancel button during the run. The frames go
//     through `engine/export/frameFolder.ts`; the RUNNER asks for the
//     folder, and looks into it.
//   - `status.setResult(...)`: what to show when the run has ended (a
//     few lines, a command with a Copy button) instead of the form.
// And `defaults` may be a function, called each time the dialog opens.
// An app that opts into `frameFolder` WITHOUT a `formatFilter` lists the
// video formats beside the folder: its runner then serves both, and the
// dialog is the folder dialog or the video dialog by the format selected
// (no bitrate and no encoder probe for the folder).
// A QUESTION, since stage R6c the same day: `status.ask({ lines,
// options, cancel })` shows a few lines and a button an option in place
// of the form or the progress (QuestionView.tsx) and resolves with the
// option chosen - or with `cancel` when the dialog is closed under it.
// The words are the runner's; the dialog knows nothing of what is asked.
// (Its first user: a runner that finds frames of its render already in
// the folder asks what to do with them.) Nobody asks, nothing changes.
// The dialog can also be opened from outside the timeline toolbar:
// `openRenderPopup()` in engine/animation/renderPopupRegistry.ts.
//
// THE RENDER RECIPE (2026-10-17, the deep zoomer's streamline stage 7;
// every app gains the first two):
//   - IT REMEMBERS. What and how to render - the format, the size,
//     Draft or Final, the samples, the bitrate, the frame step,
//     the `extra` bag - is kept under `storageKey` (localStorage, one
//     key per installed dialog) from the first change by hand, and the
//     dialog opens on it again, also after a reload. An app's `defaults`
//     apply only while nothing is kept. A kept format the form no longer
//     offers is the default's. THE RANGE IS KEPT APART, for the session
//     (in this install's closure): the dialog opens on the range it was
//     left on while the span it opens on (`defaults`' start and end, or
//     the whole timeline) is the same; a new span opens on the new span.
//   - ESCAPE CLOSES IT, but not while a run lasts (the window's X does
//     not either); while a question is open, Escape closes it as the X
//     does, and the question is answered with its `cancel`.
//   - `draft`: a Quality row, [Draft | Final], Final putting back the
//     values Draft replaced (it replaced the one-way `presets` buttons).
//   - `rangeInSeconds`: Start and End in seconds.
//   - Three formats or fewer are one segmented row, not a dropdown.
//   (`fixedSizes`, the sizes-from-a-list-only option, went with
//   `presets`. `shapes` - a width and [Window | 16:9 | 1:1], the height
//   following - went later that day: its one user, the deep zoomer,
//   takes GMT's sizes now, from the canvas (`canvasResolutionPresets`),
//   and its shape from the viewport's Fixed mode, one way, not two.)
// The words are plain (no "RAM", "DISK" or codec names), and the bitrate
// follows the size: a new size proposes its own (40 Mbps at 1920 x 1080,
// by area) unless the same change sets one.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DraggableWindow from '../../../components/DraggableWindow';
import { z } from '../../../components/ui';
import { useAnimationStore } from '../../../store/animationStore';
import { safeLocalGet, safeLocalSet } from '../../../store/safeLocalStorage';
import { VIDEO_CONFIG } from '../../../data/constants';
import { canEncodeFormat } from '../../export/videoEncoder';
import { FRAME_FOLDER_UNSUPPORTED, canPickFrameFolder } from '../../export/frameFolder';
import { registerRenderPopup } from '../../animation/renderPopupRegistry';
import { ConfigForm, isFrameFolderFormat, shownFormats } from './ConfigForm';
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

export { InternalScaleField, canvasResolutionPresets, isFrameFolderFormat } from './ConfigForm';
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

/** The fields kept across reloads (`storageKey`): what and how to render. Not the range, not the fps. */
const KEPT = ['width', 'height', 'formatIndex', 'bitrate', 'samplesPerFrame', 'frameStep'] as const;
type Kept = Partial<Pick<RenderDialogConfig, typeof KEPT[number]>>;

/** The kept fields of `from` that hold a number. */
const keptOf = (from: unknown): Kept => {
    const s = (from && typeof from === 'object' ? from : {}) as Record<string, unknown>;
    return Object.fromEntries(KEPT.filter((k) => typeof s[k] === 'number').map((k) => [k, s[k]])) as Kept;
};

/** `base`, each field taken from `stored` where that holds a value of the same type (the `extra` bag kept). */
const sameTyped = <T,>(base: T, stored: unknown): T => {
    const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
    const out = { ...base } as Record<string, unknown>;
    for (const k of Object.keys(out)) if (typeof s[k] === typeof out[k]) out[k] = s[k];
    return out as T;
};

/** The bitrate a size is given: 40 Mbps at 1920 x 1080, by area. */
const bitrateFor = (w: number, h: number): number => Math.max(1, Math.round(40 * (w * h) / (1920 * 1080)));

/**
 * The next form from a change: a new size is given its own bitrate unless the change sets one.
 *
 * @assumption A bitrate typed by hand lasts until the next change of size (the Draft / Final switch puts its own
 *   back). Read off this function; no try typed a bitrate, and no check stands behind it.
 */
function settle(c: RenderDialogConfig, patch: Partial<RenderDialogConfig>): RenderDialogConfig {
    const next = { ...c, ...patch };
    if ((next.width !== c.width || next.height !== c.height) && patch.bitrate === undefined) next.bitrate = bitrateFor(next.width, next.height);
    return next;
}

/** What one installed dialog keeps between two opens in this session: the range, and the span it was left on. */
interface DialogMemory {
    range: { span: { start: number; end: number }; startFrame: number; endFrame: number } | null;
}

/**
 * @assumption Installs via `registerRenderPopup`, NOT topbar or menu —
 *   the Timeline toolbar's Render button reads `getRenderPopup()` and
 *   hides itself when nothing is registered.
 */
export const installRenderDialog = <TExtra = Record<string, unknown>>(
    options: InstallRenderDialogOptions<TExtra>,
): void => {
    const memory: DialogMemory = { range: null };
    const RenderDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
        <RenderDialogShell options={options} memory={memory} onClose={onClose} />
    );
    registerRenderPopup(RenderDialog);
};

// ─── Internals ────────────────────────────────────────────────────

interface ShellProps<TExtra> {
    options: InstallRenderDialogOptions<TExtra>;
    memory:  DialogMemory;
    onClose: () => void;
}

/** What is kept under `storageKey`. Read back field by field: anything else in it is ignored. */
interface Stored<TExtra> {
    cfg:         Kept;
    extra:       TExtra;
    beforeDraft: Kept | null;
}

/**
 * @assumption Reopened, the dialog shows what it was left on and, while the span is the same, the range; after a
 *   reload all of that but the range; Escape closes it, but not during a run. Driven 2026-10-17 headless on the GPU
 *   (debug/scratch/streamline/stage7-try.mjs, git-ignored): in the deep zoomer the format, the width, the shape, Draft
 *   and Final, the samples and the range in seconds, through a close and a reload, Escape during a Final MP4; in GMT
 *   the format, the samples and the End frame, through a close and a reload, Escape during a WebM. NOT driven: the
 *   frame step, a typed bitrate, the `extra` bag kept (GMT's passes), Escape on an open question. No standing check:
 *   the render dialog has no smoke of its own.
 */
function RenderDialogShell<TExtra>(
    { options, memory, onClose }: ShellProps<TExtra>,
): React.ReactElement {
    const animStore = useAnimationStore();

    const showSamplesPerFrame = options.showSamplesPerFrame ?? true;
    const showFrameStep       = options.showFrameStep       ?? true;
    const showBitrate         = options.showBitrate         ?? true;
    const baseSize     = options.baseSize     ?? { width: BASE_WIDTH, height: BASE_HEIGHT };
    const expandedSize = options.expandedSize ?? baseSize;
    const storageKey   = options.storageKey   ?? `render-dialog:${window.location.pathname}`;

    // ─── The form as it opens ──────────────────────────────────────
    // The defaults (an object, or a function asked once per open), then what is kept over them, then the range.
    const opened = useMemo(() => {
        const d = typeof options.defaults === 'function' ? options.defaults() : options.defaults;
        const span = { start: d?.startFrame ?? 0, end: d?.endFrame ?? animStore.durationFrames };
        const width = d?.width ?? 1280, height = d?.height ?? 720;
        const base: RenderDialogConfig = {
            width, height,
            formatIndex:     d?.formatIndex     ?? 0,
            bitrate:         d?.bitrate         ?? bitrateFor(width, height),
            samplesPerFrame: d?.samplesPerFrame ?? VIDEO_CONFIG.DEFAULT_SAMPLES,
            startFrame:      span.start,
            endFrame:        span.end,
            frameStep:       d?.frameStep       ?? 1,
            fps:             d?.fps             ?? animStore.fps,
        };
        let stored: Partial<Stored<TExtra>> | null = null;
        try { stored = JSON.parse(safeLocalGet(storageKey) ?? 'null'); } catch { /* not the dialog's: nothing kept */ }
        let cfg: RenderDialogConfig = { ...base, ...keptOf(stored?.cfg) };
        if (!shownFormats(options.formatFilter, !!options.frameFolder).includes(cfg.formatIndex)) cfg.formatIndex = base.formatIndex;
        const kept = memory.range;
        if (kept && kept.span.start === span.start && kept.span.end === span.end) cfg = { ...cfg, startFrame: kept.startFrame, endFrame: kept.endFrame };
        const beforeDraft = options.draft && stored?.beforeDraft ? keptOf(stored.beforeDraft) : null;
        return { span, cfg, beforeDraft, extra: sameTyped((d?.extra ?? {}) as TExtra, stored?.extra), fps: d?.fps };
    }, []);

    const [cfg, setCfgState]          = useState<RenderDialogConfig>(opened.cfg);
    const [extra, setExtraState]      = useState<TExtra>(opened.extra);
    /** In Draft: the values Draft replaced, for Final to put back. Null: Final. */
    const [beforeDraft, setBeforeDraft] = useState<Kept | null>(opened.beforeDraft);
    /** Set by the first change by hand: nothing is kept for a dialog that was only looked at. */
    const changed = useRef(false);

    // A change by hand. In Draft, a change to a field Draft set (the bitrate aside: it follows the size) is Final
    // with that change - and Final's bitrate with it, unless the change is to the size.
    const setCfg = (patch: Partial<RenderDialogConfig>) => {
        changed.current = true;
        let next = patch;
        if (beforeDraft && Object.keys(patch).some((k) => k !== 'bitrate' && k in beforeDraft)) {
            const { bitrate, ...rest } = beforeDraft;
            next = { ...rest, ...('width' in patch || 'height' in patch || bitrate === undefined ? {} : { bitrate }), ...patch };
            setBeforeDraft(null);
        }
        setCfgState((c) => settle(c, next));
    };
    const patchExtra = (patch: Partial<TExtra>) => {
        changed.current = true;
        setExtraState((e) => ({ ...e, ...patch }));
    };
    const setDraft = (on: boolean) => {
        if (!options.draft || on === !!beforeDraft) return;
        changed.current = true;
        if (on) {
            // Kept for Final: the fields Draft sets, and the size and the bitrate, which follow them.
            const patch = options.draft.apply(cfg);
            const keys = new Set(['width', 'height', 'bitrate', ...Object.keys(patch)]);
            setBeforeDraft(keptOf(Object.fromEntries([...keys].map((k) => [k, cfg[k as keyof RenderDialogConfig]]))));
            setCfgState((c) => settle(c, patch));
        } else {
            setCfgState((c) => settle(c, beforeDraft ?? {}));
            setBeforeDraft(null);
        }
    };

    // Kept: what and how, from the first change by hand (storageKey); the range, for the session (the closure).
    useEffect(() => {
        if (!changed.current) return;
        const stored: Stored<TExtra> = { cfg: keptOf(cfg), extra, beforeDraft };
        safeLocalSet(storageKey, JSON.stringify(stored));
    }, [cfg, extra, beforeDraft]);
    useEffect(() => {
        memory.range = { span: opened.span, startFrame: cfg.startFrame, endFrame: cfg.endFrame };
    }, [cfg.startFrame, cfg.endFrame]);

    // Re-clamp the frame range when the timeline duration changes. The
    // dialog is a non-modal DraggableWindow, so the user can shrink the
    // timeline's LEN while it's open; without this, a stale endFrame
    // (e.g. 300) stays above the new max (e.g. 100) until the End field
    // is touched, and the render would emit frames past the timeline.
    // Only shrinks — growing the duration leaves the range for the user
    // to extend. Also catches an out-of-range `defaults.endFrame`, or a
    // range kept from a longer timeline.
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
        if (opened.fps !== undefined) return;
        setCfgState((c) => (c.fps === animStore.fps ? c : { ...c, fps: animStore.fps }));
    }, [animStore.fps]);

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
            dismissOnEscape
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
                    rangeInSeconds={!!options.rangeInSeconds}
                    draft={options.draft}
                    isDraft={!!beforeDraft}
                    setDraft={setDraft}
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
