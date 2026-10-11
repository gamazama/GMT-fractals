// Public types for the @engine/render-dialog plugin. Apps install
// the plugin once and provide an app-specific `runner` that handles
// the per-frame pump + encoder lifecycle. The plugin owns the dialog
// UI, capability check, disk-mode detection, flag/state plumbing.

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
}

export interface RenderDialogResult {
    lines:    string[];
    /** A line to run elsewhere (an ffmpeg call for a folder of frames). */
    command?: string;
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
    /** The "Resume" box: skip frames already in the folder. The dialog
     *  always sets it; it is true only when the app installed with
     *  `frameFolder`, the folder format is selected and the box is
     *  ticked. (Optional in the type: a runner that re-packs its deps
     *  into a shape of its own, as GMT's does, need not carry it.) */
    resume?:    boolean;
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

/** One named set of form values: a button above the form that patches
 *  it (the install option `presets`). */
export interface RenderDialogPreset {
    /** The button's text. */
    label:  string;
    /** Its tooltip: what it sets, in a line. */
    title?: string;
    /** The fields to change, given the form as it stands. Called on the
     *  click, so it may read live state (the sizes on offer now). */
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
     *  (`engine/export/frameFolder.ts`). It adds the format
     *  "PNG sequence (folder)" to the dropdown - `VIDEO_FORMATS`' PNG
     *  sequence under that name - and, while that format is selected: a
     *  "Resume" box (`deps.resume`), the start label "Select output
     *  folder…", one Cancel button during the run instead of Interrupt /
     *  Resume / Finish / Discard, and no encoder probe (the format is
     *  available exactly where the browser can write into a folder; the
     *  dialog says so in one line where it cannot). The RUNNER asks for
     *  the folder (`pickFrameFolder`, first thing, inside the click).
     *  Without this option nothing above exists: the dialog is what it
     *  was. To offer ONLY that format, also pass a `formatFilter`;
     *  without one the video formats are listed beside it, and for those
     *  the dialog is the video dialog (the encoder probe, the bitrate,
     *  Interrupt / Resume / Finish / Discard) - the runner serves both. */
    frameFolder?: boolean;

    /** Default false. True: the size is one of `resolutionPresets` and
     *  nothing else - no Width / Height fields and no "Custom" entry;
     *  a size that is not in the list (the presets changed under it)
     *  snaps to the preset with the nearest long edge. For an app whose
     *  picture has a shape of its own, where a width and a height typed
     *  apart could not both be honoured. */
    fixedSizes?: boolean;

    /** OPT-IN: named sets of form values, each a small button in a row
     *  above the form ("Draft": a small size and one sample, for a quick
     *  look before the real render). A click patches the form with what
     *  `apply` returns and starts nothing. Absent or empty: no row. */
    presets?: RenderDialogPreset[];

    /** Standard form-control visibility. Apps that don't have TSAA
     *  set `showSamplesPerFrame: false`; apps that don't want frame-
     *  step set `showFrameStep: false`. Defaults: all true. The bitrate
     *  is never shown for the `frameFolder` format (it has none). */
    showSamplesPerFrame?: boolean;
    showFrameStep?:       boolean;
    showBitrate?:         boolean;

    /** Force-disable disk mode even when `showSaveFilePicker` is
     *  available. Use when the runner only ever saves via downloadBlob
     *  (RAM-only) — the badge then correctly says RAM and the start
     *  button label doesn't promise a file picker that won't appear. */
    disableDiskMode?: boolean;

    /** Filter / extend the format dropdown. Defaults to all non-image-
     *  sequence formats. App-gmt overrides to include PNG/JPG sequences. */
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
     *  that depend on live store / window state (e.g. app-gmt's
     *  `Viewport (WxH)` and `Screen (WxH)` entries) — the form calls
     *  it on each render so values stay current. */
    resolutionPresets?: RenderDialogResolutionPreset[] | (() => RenderDialogResolutionPreset[]);

    /** Override the Start button label. Default reads from disk-mode:
     *  "Select Output File…" / "Start RAM Render". App-gmt uses this
     *  to show "Select Output Folder…" for image-sequence formats. */
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
