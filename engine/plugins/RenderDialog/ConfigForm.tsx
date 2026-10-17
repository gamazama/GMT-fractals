// Pre-render settings form. Lifted from fluid-toy's ConfigForm and
// generalised — every app-specific knob is either a config flag
// (showSamplesPerFrame etc.) or an extension slot (extraFormFields,
// extraWarning, extraInfoRows).
//
// Rows, top to bottom: What (the format: one segmented row for three
// formats or fewer, a dropdown above that), the size (a width and a
// height, or under `shapes` a width and a Shape row), Quality (`draft`
// only), the range (frames, or seconds under `rangeInSeconds`), bitrate,
// samples, the app's fields, the summary. The words are plain: no
// codec's name and no "RAM" / "DISK" (the format labels are
// data/constants.ts's).

import React from 'react';
import Slider, { DraggableNumber } from '../../../components/Slider';
import Dropdown from '../../../components/Dropdown';
import Button from '../../../components/Button';
import { Segmented } from '../../../components/ui';
import { PlayIcon, SaveIcon, AlertIcon } from '../../../components/Icons';
import { VIDEO_FORMATS } from '../../../data/constants';
import type {
    RenderDialogConfig,
    RenderDialogExtraFieldsProps,
    RenderDialogPreset,
    RenderDialogResolutionPreset,
    RenderDialogShape,
} from './types';

/** `VIDEO_FORMATS`' PNG sequence: under the install option `frameFolder` it is the format
 *  "Frames (PNG folder)" - one PNG a frame, written by the runner into a folder. */
export const FRAME_FOLDER_FORMAT_INDEX = VIDEO_FORMATS.findIndex((f) => f.imageSequence && f.ext === 'png');
export const isFrameFolderFormat = (formatIndex: number): boolean => formatIndex === FRAME_FOLDER_FORMAT_INDEX;

type FormatFilter = (formatDef: typeof VIDEO_FORMATS[number], index: number) => boolean;

/** The formats the form offers, in the order shown: the `formatFilter`'s, or every video format
 *  (and the folder under `frameFolder`); the formats marked `listLast` (data/constants.ts) go under
 *  the others. The shell checks a remembered format against this. */
export function shownFormats(formatFilter: FormatFilter | undefined, frameFolder: boolean): number[] {
    return VIDEO_FORMATS
        .map((f, i) => ({ f, i }))
        .filter(({ f, i }) => (formatFilter ? formatFilter(f, i) : (!f.imageSequence || (frameFolder && isFrameFolderFormat(i)))))
        .sort((a, b) => Number(a.f.listLast) - Number(b.f.listLast))
        .map(({ i }) => i);
}

const DEFAULT_RES_PRESETS: RenderDialogResolutionPreset[] = [
    { label: '720p HD (16:9)',         w: 1280, h: 720  },
    { label: '1080p FHD (16:9)',       w: 1920, h: 1080 },
    { label: '1440p QHD (16:9)',       w: 2560, h: 1440 },
    { label: '4K UHD (16:9)',          w: 3840, h: 2160 },
    { label: 'Square 1:1 (Insta)',     w: 1080, h: 1080 },
    { label: 'Portrait 4:5 (Insta)',   w: 1080, h: 1350 },
    { label: 'Vertical 9:16 (TikTok)', w: 1080, h: 1920 },
];

/** A segmented row at the form's size: its buttons sized from outside (they are its direct
 *  children), as the deep zoomer's Route tab sizes its Timing row. */
const SEG = 'w-full [&>button]:flex-1 [&>button]:h-5 [&>button]:text-[10px]';

export interface ConfigFormProps<TExtra> {
    cfg:    RenderDialogConfig;
    setCfg: (patch: Partial<RenderDialogConfig>) => void;

    extra:      TExtra;
    patchExtra: (patch: Partial<TExtra>) => void;

    durationFrames:     number;
    isFormatSupported:  boolean;
    formatSupportError: string | null;
    isDiskMode:         boolean;

    showSamplesPerFrame: boolean;
    showFrameStep:       boolean;
    showBitrate:         boolean;
    formatFilter?:       FormatFilter;
    resolutionPresets?:  RenderDialogResolutionPreset[] | (() => RenderDialogResolutionPreset[]);
    /** The install options of the same names (types.ts). All absent: the form as it always was. */
    frameFolder:         boolean;
    rangeInSeconds:      boolean;
    shapes?:             RenderDialogShape[];
    shape:               number;
    setShape:            (index: number) => void;
    draft?:              RenderDialogPreset;
    isDraft:             boolean;
    setDraft:            (on: boolean) => void;

    ExtraFormFields?: React.FC<RenderDialogExtraFieldsProps<TExtra>>;
    ExtraInfoRows?:   React.FC<{ cfg: RenderDialogConfig; extra: TExtra }>;
    ExtraWarning?:    React.FC<{ cfg: RenderDialogConfig; extra: TExtra }>;

    /** Optional label override / disable check for the Start button.
     *  Receive cfg + extra + isDiskMode + isFormatSupported. */
    startLabel?:      (ctx: { cfg: RenderDialogConfig; extra: TExtra; isDiskMode: boolean; isFormatSupported: boolean }) => string;
    isStartDisabled?: (ctx: { cfg: RenderDialogConfig; extra: TExtra; isDiskMode: boolean; isFormatSupported: boolean }) => boolean;

    onStart: () => void;
}

export function ConfigForm<TExtra>(props: ConfigFormProps<TExtra>): React.ReactElement {
    const {
        cfg, setCfg, extra, patchExtra,
        durationFrames, isFormatSupported, formatSupportError, isDiskMode,
        showSamplesPerFrame, showFrameStep, showBitrate,
        formatFilter, resolutionPresets,
        frameFolder, rangeInSeconds, shapes, shape, setShape, draft, isDraft, setDraft,
        ExtraFormFields, ExtraInfoRows, ExtraWarning,
        startLabel, isStartDisabled,
        onStart,
    } = props;

    const currentFormat = VIDEO_FORMATS[cfg.formatIndex];
    // `frameFolder`: the PNG sequence is offered, written by the runner into a folder.
    const folderFormat = frameFolder && isFrameFolderFormat(cfg.formatIndex);
    const formatOptions = shownFormats(formatFilter, frameFolder).map((index) => ({ label: VIDEO_FORMATS[index].label, value: index }));

    const presets = typeof resolutionPresets === 'function'
        ? resolutionPresets()
        : (resolutionPresets ?? DEFAULT_RES_PRESETS);
    const presetVal  = `${cfg.width}x${cfg.height}`;
    const presetOpts = [
        ...presets.map((p) => ({ label: `${p.label} (${p.w}x${p.h})`, value: `${p.w}x${p.h}` })),
        ...(presets.some((p) => p.w === cfg.width && p.h === cfg.height)
            ? []
            : [{ label: `Custom (${cfg.width}x${cfg.height})`, value: presetVal }]),
    ];
    // `shapes`: the list is of widths; a width not in it (a Draft's) is listed as the size it gives.
    const widthOpts = [
        ...presets.map((p) => ({ label: p.label, value: p.w })),
        ...(presets.some((p) => p.w === cfg.width) ? [] : [{ label: `${cfg.width} x ${cfg.height}`, value: cfg.width }]),
    ];

    const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;
    const durationSec = totalFrames / cfg.fps;
    // `rangeInSeconds`: shown and typed in seconds of the timeline, kept in frames.
    const shown = (frame: number): number => (rangeInSeconds ? frame / cfg.fps : frame);
    const toFrame = (v: number): number => Math.round(rangeInSeconds ? v * cfg.fps : v);
    const rangeText = (frame: number): string => (rangeInSeconds ? `${shown(frame).toFixed(2)} s` : frame.toFixed(0));
    const rangeStep = rangeInSeconds ? 1 / cfg.fps : 1;

    const what = currentFormat.imageSequence ? `One ${currentFormat.ext.toUpperCase()} a frame, into a folder` : 'One video file';
    const inMemory = !isDiskMode && !currentFormat.imageSequence;

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-1 bg-surface-section border-b border-line/5 flex justify-between items-center gap-2 shrink-0">
                <span className="t-label">{what} · {cfg.fps} frames a second</span>
                {inMemory && (
                    <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-warn/15 text-warn border-warn/30 whitespace-nowrap"
                        title="This browser cannot write the file as it goes: the video is made in memory and saved as a download when it is done. A long video at a large size may not fit."
                    >
                        Saved as a download
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-1.5 space-y-1">
                {formatOptions.length <= 3 ? (
                    <div className="mb-1.5">
                        <label className="t-label mb-0.5 block">What</label>
                        <Segmented
                            name="render-what"
                            className={SEG}
                            value={cfg.formatIndex}
                            onChange={(v) => setCfg({ formatIndex: v })}
                            options={formatOptions.map((o) => ({ id: o.value, name: o.label }))}
                        />
                    </div>
                ) : (
                    <Dropdown
                        label="What"
                        value={cfg.formatIndex}
                        onChange={(v) => setCfg({ formatIndex: Number(v) })}
                        options={formatOptions}
                        className="mb-1.5"
                    />
                )}

                {!isFormatSupported && (
                    <div className="mx-1 mb-2 p-1.5 bg-danger/10 border border-danger/30 rounded flex items-center gap-2 text-[9px] text-danger">
                        <AlertIcon />
                        <span>{formatSupportError ?? 'This browser cannot make this format.'}</span>
                    </div>
                )}

                {ExtraWarning && <ExtraWarning cfg={cfg} extra={extra} />}

                {shapes ? (
                    <>
                        <Dropdown
                            label="Width"
                            labelSuffix={<span className="font-normal text-fg-muted"> · {cfg.width} x {cfg.height}</span>}
                            value={cfg.width}
                            onChange={(v) => setCfg({ width: Number(v) })}
                            options={widthOpts}
                            className="mb-1.5"
                        />
                        <div className="mb-1.5">
                            <label className="t-label mb-0.5 block">Shape</label>
                            <Segmented
                                name="render-shape"
                                className={SEG}
                                value={shape}
                                onChange={setShape}
                                options={shapes.map((s, i) => ({ id: i, name: s.label, title: s.title }))}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <Dropdown
                            label="Size"
                            value={presetVal}
                            onChange={(v) => {
                                const [w, h] = (v as string).split('x').map(Number);
                                setCfg({ width: w, height: h });
                            }}
                            options={presetOpts}
                            className="mb-1.5"
                        />
                        <div className="flex gap-1 mb-1.5">
                            <div className="flex-1">
                                <label className="t-label mb-0.5 block">Width</label>
                                <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                                    <DraggableNumber
                                        value={cfg.width}
                                        onChange={(v) => setCfg({ width: Math.max(32, Math.round(v)) })}
                                        step={2}
                                        overrideText={cfg.width.toFixed(0)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="t-label mb-0.5 block">Height</label>
                                <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                                    <DraggableNumber
                                        value={cfg.height}
                                        onChange={(v) => setCfg({ height: Math.max(32, Math.round(v)) })}
                                        step={2}
                                        overrideText={cfg.height.toFixed(0)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {draft && (
                    <div className="mb-1.5">
                        <label className="t-label mb-0.5 block">Quality</label>
                        <Segmented
                            name="render-quality"
                            className={SEG}
                            value={isDraft ? 'draft' : 'final'}
                            onChange={(v) => setDraft(v === 'draft')}
                            options={[
                                { id: 'draft', name: draft.label, title: draft.title },
                                { id: 'final', name: 'Final', title: 'The size and the samples set for the real render' },
                            ]}
                        />
                    </div>
                )}

                <div className="flex gap-1">
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">Start</label>
                        <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                            <DraggableNumber
                                value={shown(cfg.startFrame)}
                                onChange={(v) => setCfg({ startFrame: Math.max(0, Math.min(toFrame(v), cfg.endFrame)) })}
                                step={rangeStep} hardMin={0} hardMax={shown(cfg.endFrame)}
                                highlight overrideText={rangeText(cfg.startFrame)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">End</label>
                        <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                            <DraggableNumber
                                value={shown(cfg.endFrame)}
                                onChange={(v) => setCfg({ endFrame: Math.max(cfg.startFrame, Math.min(toFrame(v), durationFrames)) })}
                                step={rangeStep} hardMin={shown(cfg.startFrame)} hardMax={shown(durationFrames)}
                                highlight overrideText={rangeText(cfg.endFrame)}
                            />
                        </div>
                    </div>
                    {showFrameStep && (
                        <div className="flex-[0.7]">
                            <label className="t-label mb-0.5 block">Step</label>
                            <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                                <DraggableNumber
                                    value={cfg.frameStep}
                                    onChange={(v) => setCfg({ frameStep: Math.max(1, Math.round(v)) })}
                                    step={1} min={1} overrideText={cfg.frameStep.toFixed(0)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {showBitrate && !folderFormat && (
                    <Slider
                        label="Bitrate (Mbps)"
                        value={cfg.bitrate}
                        min={1} max={100} step={1}
                        onChange={(v) => setCfg({ bitrate: v })}
                        overrideInputText={`${cfg.bitrate}`}
                    />
                )}

                {showSamplesPerFrame && (
                    <>
                        <Slider
                            label="Samples / Frame"
                            value={cfg.samplesPerFrame}
                            min={1} max={256} step={1}
                            onChange={(v) => setCfg({ samplesPerFrame: v })}
                            overrideInputText={cfg.samplesPerFrame.toFixed(0)}
                        />
                        <div className="px-2 -mt-1 mb-1 text-[8px] text-fg-dim leading-tight">
                            Samples per output frame. Higher = cleaner image but slower export.
                        </div>
                    </>
                )}

                {ExtraFormFields && (
                    <ExtraFormFields
                        cfg={cfg}
                        setCfg={setCfg}
                        extra={extra}
                        patchExtra={patchExtra}
                        isDiskMode={isDiskMode}
                        isFormatSupported={isFormatSupported}
                    />
                )}

                <div className="flex flex-col gap-1 px-2 py-1.5 mt-2 bg-line/5 rounded border border-line/5 text-[10px]">
                    <div className="flex justify-between"><span className="text-fg-muted">Frames</span><span className="font-mono text-fg-secondary">{totalFrames}</span></div>
                    <div className="flex justify-between"><span className="text-fg-muted">Duration</span><span className="font-mono text-accent-300">{durationSec.toFixed(2)}s</span></div>
                    {ExtraInfoRows && <ExtraInfoRows cfg={cfg} extra={extra} />}
                </div>
            </div>

            <div className="p-1.5 bg-surface-sunken/50 border-t border-line/10 shrink-0">
                <Button
                    onClick={onStart}
                    label={
                        startLabel
                            ? startLabel({ cfg, extra, isDiskMode, isFormatSupported })
                            : folderFormat ? 'Save to a folder…'
                            : (isDiskMode ? 'Save to a file…' : 'Render, then download')
                    }
                    variant="primary"
                    fullWidth
                    disabled={
                        !isFormatSupported ||
                        (isStartDisabled?.({ cfg, extra, isDiskMode, isFormatSupported }) ?? false)
                    }
                    icon={isDiskMode || folderFormat ? <SaveIcon /> : <PlayIcon />}
                />
            </div>
        </div>
    );
}
