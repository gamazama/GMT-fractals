// Public types for the @engine/render-dialog plugin. Apps install
// the plugin once and provide an app-specific `runner` that handles
// the per-frame pump + encoder lifecycle. The plugin owns the dialog
// UI, capability check, disk-mode detection, flag/state plumbing, and
// what it remembers between two opens (`storageKey`, index.tsx).

import type { MutableRefObject, ReactNode } from 'react';
import type { VIDEO_FORMATS } from '../../../data/constants';

export interface RenderDialogConfig {
    width:           number;
    height:          number;
    formatIndex:     number;
    bitrate:         number;
    /** Samples per output frame. Drives TSAA-style convergence in apps
     *  that have it; ignored by deterministic single-pass apps. */
    samplesPerFrame: number;
    startFrame:      number;
    endFrame:        number;
    frameStep:       number;
    fps:             number;
}

export interface RenderDialogFlags {
    cancelledRef:   MutableRefObject<boolean>;
    finishEarlyRef: MutableRefObject<boolean>;
    stoppingRef:    MutableRefObject<boolean>;
    startTimeRef:   MutableRefObject<number>;
}

export interface RenderDialogStatus {
    /** 0..1 — plugin formats this as a percentage in the UI. */
    setProgress:      (n: number) => void;
    setElapsedTime:   (n: number) => void;
    /** The time left, in seconds, as a range ("1m 20s – 1m 40s"). A
     *  runner with ONE figure passes it as both ends (above 0): the
     *  dialog then says "about" it, in whole minutes from a minute on. */
    setEtaRange:      (r: { min: number; max: number }) => void;
    setLastFrameTime: (n: number) => void;
    setStatusText:    (s: string) => void;
    setIsRendering:   (b: boolean) => void;
    setIsStopping:    (b: boolean) => void;
    /** What the dialog shows once the run has ended, in place of the
     *  form: a few plain lines and, optionally, a command line with a
     *  Copy button. A runner that never calls it goes straight back to
     *  the form, as every runner did before this existed. Call it
     *  before `setIsRendering(false)`. */
    setResult:        (r: RenderDialogResult | null) => void;
    /** Put a question to the user and wait for the answer: the dialog
     *  shows it in place of the form or the progress, one button an
     *  option, and resolves with the chosen option's `id`. If the dialog
     *  goes away while it is open it resolves with `question.cancel`. It
     *  never rejects. The dialog knows nothing of what is asked: the
     *  runner writes the words. A runner that never asks never sees it. */
    ask:              (question: RenderDialogQuestion) => Promise<string>;
}

export interface RenderDialogResult {
    lines:    string[];
    /** A line to run elsewhere (an ffmpeg call for a folder of frames). */
    command?: string;
}

/** A question a runner asks while a run is starting (`status.ask`). */
export interface RenderDialogQuestion {
    /** What is asked, in a few plain lines. */
    lines:   string[];
    /** The answers, a button each, in this order. `primary`: the one the
     *  dialog draws as the expected answer. */
    options: Array<{ id: string; label: string; title?: string; primary?: boolean }>;
    /** The `id` it resolves with when nobody can answer any more (the
     *  dialog was closed under it). */
    cancel:  string;
}

export interface RenderDialogDeps<TExtra = Record<string, unknown>> {
    cfg:        RenderDialogConfig;
    /** App-specific config bag fed by `extraFormFields`. Empty `{}`
     *  for apps that don't supply extras (demo, fluid-toy v1). App-gmt
     *  carries multi-pass flags / internal-scale / depth range. */
    extra:      TExtra;
    flags:      RenderDialogFlags;
    status:     RenderDialogStatus;
    isDiskMode: boolean;
}

export type RenderDialogRunner<TExtra = Record<string, unknown>> =
    (deps: RenderDialogDeps<TExtra>) => Promise<void>;

export interface RenderDialogExtraFieldsProps<TExtra = Record<string, unknown>> {
    extra:             TExtra;
    patchExtra:        (patch: Partial<TExtra>) => void;
    cfg:               RenderDialogConfig;
    setCfg:            (patch: Partial<RenderDialogConfig>) => void;
    isDiskMode:        boolean;
    isFormatSupported: boolean;
}

export interface RenderDialogStartContext<TExtra = Record<string, unknown>> {
    cfg:               RenderDialogConfig;
    extra:             TExtra;
    isDiskMode:        boolean;
    isFormatSupported: boolean;
}

export interface RenderDialogResolutionPreset {
    label: string;
    w:     number;
    h:     number;
}

export type RenderDialogDefaults<TExtra = Record<string, unknown>> =
    Partial<RenderDialogConfig> & { extra?: TExtra };

/** One named set of form values (the install option `draft`). */
export interface RenderDialogPreset {
    /** The option's word ("Draft"). */
    label:  string;
    /** Its tooltip: what it sets, in a line. */
    title?: string;
    /** The fields to change, given the form as it stands. Called when it
     *  is chosen, so it may read live state. */
    apply:  (cfg: RenderDialogConfig) => Partial<RenderDialogConfig>;
}

export interface InstallRenderDialogOptions<TExtra = Record<string, unknown>> {
    /** App-specific per-frame pipeline. Plugin handles UI + form +
     *  flags + status; runner handles encoder lifecycle. */
    runner: RenderDialogRunner<TExtra>;

    /** Dialog window title. Default 'Render Video'. */
    title?: string;

    /** Initial form defaults. Apps override the standard fields here;
     *  `extra` carries the app-specific bag. A FUNCTION is called each
     *  time the dialog opens, for defaults that depend on what is on the
     *  timeline then (the deep zoomer: its route's first and last
     *  keyframe). */
    defaults?: RenderDialogDefaults<TExtra> | (() => RenderDialogDefaults<TExtra>);

    /** OPT-IN, for an app whose runner makes every frame itself and
     *  writes one file a frame into a folder the user picks
     *  (`engine/export/frameFolder.ts`). It adds the formats
     *  "Frames (PNG folder)" and "Frames (JPG folder)" - `VIDEO_FORMATS`'
     *  image sequences - and, while one of them is selected:
     *  the start label "Save to a folder…", one Cancel button during
     *  the run instead of Interrupt / Resume / Finish / Discard, and no
     *  encoder probe (the format is available exactly where the browser
     *  can write into a folder; the dialog says so in one line where it
     *  cannot). The RUNNER asks for the folder (`pickFrameFolder`, first
     *  thing, inside the click), and it is the runner that looks into it:
     *  frames found there are a question for `status.ask`, not a box on
     *  the form.
     *  Without this option nothing above exists: the dialog is what it
     *  was. To offer fewer formats, also pass a `formatFilter` (three
     *  formats or fewer are drawn as one segmented row instead of a
     *  dropdown);
     *  without one the video formats are listed beside it, and for those
     *  the dialog is the video dialog (the encoder probe, the bitrate,
     *  Interrupt / Resume / Finish / Discard) - the runner serves both. */
    frameFolder?: boolean;

    /** The localStorage key under which the dialog keeps what and how to
     *  render between two opens and across reloads: the format, the size,
     *  Draft or Final, the samples, the bitrate, the frame step
     *  and the `extra` bag (the range is kept apart, for the session: see
     *  index.tsx). One key per installed dialog. Default
     *  `render-dialog:<the page's path>`. */
    storageKey?: string;

    /** OPT-IN: a "Quality" row, [Draft | Final]. Choosing Draft applies
     *  this preset (a small size and one sample, for a quick look before
     *  the real render) and keeps the values it replaced; Final puts them
     *  back. Changing one of those fields by hand while in Draft is Final
     *  with that change. Absent: no row. */
    draft?: RenderDialogPreset;

    /** Default false. True: the range's Start and End are shown and
     *  typed in seconds of the timeline (the config stays in frames). */
    rangeInSeconds?: boolean;

    /** Standard form-control visibility. Apps that don't have TSAA
     *  set `showSamplesPerFrame: false`; apps that don't want frame-
     *  step set `showFrameStep: false`. Defaults: all true. The bitrate
     *  is never shown for the `frameFolder` format (it has none). */
    showSamplesPerFrame?: boolean;
    showFrameStep?:       boolean;
    showBitrate?:         boolean;

    /** Force-disable disk mode even when `showSaveFilePicker` is
     *  available. Use when the runner only ever saves via downloadBlob
     *  (in memory only) — the form then says the video is saved as a
     *  download, and the start button doesn't promise a file picker. */
    disableDiskMode?: boolean;

    /** Filter / extend the format dropdown. Defaults to all non-image-
     *  sequence formats, and under `frameFolder` the two folders too.
     *  App-gmt overrides to include PNG/JPG sequences. */
    formatFilter?: (formatDef: typeof VIDEO_FORMATS[number], index: number) => boolean;

    /** Custom capability probe. Defaults to the main-thread encoder's
     *  `canEncodeFormat` from engine/export/videoEncoder. Override
     *  when the runner uses a different encoder (e.g. app-gmt's
     *  worker, which DOES support image sequences via FSA). Returns
     *  `{ ok, reason? }`; the dialog disables Start + shows `reason`
     *  in an inline error when `ok` is false. */
    canEncode?: (
        formatIndex: number,
        width:       number,
        height:      number,
        bitrateMbps: number,
    ) => Promise<{ ok: boolean; reason?: string }>;

    /** Resolution preset list. Pass a function for reactive presets
     *  that depend on live store / window state (e.g.
     *  `canvasResolutionPresets`, ConfigForm.tsx: the canvas's
     *  `Viewport (WxH)` in Fixed mode and the window's `Screen (WxH)`)
     *  — the form calls it on each render so values stay current. */
    resolutionPresets?: RenderDialogResolutionPreset[] | (() => RenderDialogResolutionPreset[]);

    /** Override the Start button label. Default reads from disk-mode:
     *  "Save to a file…" / "Render, then download". App-gmt uses this
     *  to show "Save to a folder…" for image-sequence formats. */
    startLabel?: (ctx: RenderDialogStartContext<TExtra>) => string;

    /** Extra disabled-state check on top of the built-in
     *  `!isFormatSupported`. Useful for "no passes selected" or
     *  "image sequence requires FSA". Returns true to disable. */
    isStartDisabled?: (ctx: RenderDialogStartContext<TExtra>) => boolean;

    /** Inline form section rendered below the standard fields. */
    extraFormFields?: React.FC<RenderDialogExtraFieldsProps<TExtra>>;

    /** Inline summary block extras (e.g. an estimated total-render
     *  panel). Renders alongside the default Frames / Duration row. */
    extraInfoRows?: React.FC<{ cfg: RenderDialogConfig; extra: TExtra }>;

    /** Optional warning banner above the form (e.g. Firefox H.264
     *  bitrate cap). Returns null when no warning applies. */
    extraWarning?: React.FC<{ cfg: RenderDialogConfig; extra: TExtra }>;

    /** Lifecycle hook fired when the dialog mounts. Return cleanup
     *  that runs on unmount. App-gmt uses this for setPreviewSampleCap
     *  + adaptive-suppression while the dialog is open. */
    onMount?: () => (() => void) | void;

    /** Window sizing. */
    baseSize?:     { width: number; height: number };
    expandedSize?: { width: number; height: number };

    /** Custom dialog body for the rendering state. Defaults to the
     *  built-in <RenderingView />. Most apps don't need to override. */
    renderingViewExtra?: ReactNode;
}
