// Pre-render settings form. Lifted from fluid-toy's ConfigForm and
// generalised — every app-specific knob is either a config flag
// (showSamplesPerFrame etc.) or an extension slot (extraFormFields,
// extraWarning, extraInfoRows).

import React from 'react';
import Slider, { DraggableNumber } from '../../../components/Slider';
import Dropdown from '../../../components/Dropdown';
import Button from '../../../components/Button';
import { PlayIcon, SaveIcon, AlertIcon } from '../../../components/Icons';
import { VIDEO_FORMATS } from '../../../data/constants';
import type {
    RenderDialogConfig,
    RenderDialogExtraFieldsProps,
    RenderDialogResolutionPreset,
} from './types';

const DEFAULT_RES_PRESETS: RenderDialogResolutionPreset[] = [
    { label: '720p HD (16:9)',         w: 1280, h: 720  },
    { label: '1080p FHD (16:9)',       w: 1920, h: 1080 },
    { label: '1440p QHD (16:9)',       w: 2560, h: 1440 },
    { label: '4K UHD (16:9)',          w: 3840, h: 2160 },
    { label: 'Square 1:1 (Insta)',     w: 1080, h: 1080 },
    { label: 'Portrait 4:5 (Insta)',   w: 1080, h: 1350 },
    { label: 'Vertical 9:16 (TikTok)', w: 1080, h: 1920 },
];

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
    formatFilter?:       (formatDef: typeof VIDEO_FORMATS[number], index: number) => boolean;
    resolutionPresets?:  RenderDialogResolutionPreset[] | (() => RenderDialogResolutionPreset[]);

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
        ExtraFormFields, ExtraInfoRows, ExtraWarning,
        startLabel, isStartDisabled,
        onStart,
    } = props;

    const currentFormat = VIDEO_FORMATS[cfg.formatIndex];
    const formatOptions = VIDEO_FORMATS
        .map((f, i) => ({ formatDef: f, index: i }))
        .filter(({ formatDef, index }) =>
            formatFilter ? formatFilter(formatDef, index) : !formatDef.imageSequence
        )
        .map(({ formatDef, index }) => ({ label: formatDef.label, value: index }));

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

    const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;
    const durationSec = totalFrames / cfg.fps;

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-1 bg-surface-section border-b border-line/5 flex justify-between items-center shrink-0">
                <span className="t-label">{currentFormat.container.toUpperCase()} • {currentFormat.codec.toUpperCase()} • {cfg.fps} FPS</span>
                <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isDiskMode ? 'bg-ok/15 text-ok border-ok/30' : 'bg-warn/15 text-warn border-warn/30'}`}
                    title={isDiskMode ? 'Direct disk write' : 'In-memory buffer (large videos may exceed RAM)'}
                >
                    {isDiskMode ? 'DISK' : 'RAM'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-1.5 space-y-1">
                <Dropdown
                    label="Resolution"
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

                <Dropdown
                    label="Format"
                    value={cfg.formatIndex}
                    onChange={(v) => setCfg({ formatIndex: Number(v) })}
                    options={formatOptions}
                    className="mb-1.5"
                />

                {!isFormatSupported && (
                    <div className="mx-1 mb-2 p-1.5 bg-danger/10 border border-danger/30 rounded flex items-center gap-2 text-[9px] text-danger">
                        <AlertIcon />
                        <span>{formatSupportError ?? 'Format incompatible with browser/GPU.'}</span>
                    </div>
                )}

                {ExtraWarning && <ExtraWarning cfg={cfg} extra={extra} />}

                <div className="flex gap-1">
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">Start</label>
                        <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                            <DraggableNumber
                                value={cfg.startFrame}
                                onChange={(v) => setCfg({ startFrame: Math.max(0, Math.min(Math.round(v), cfg.endFrame)) })}
                                step={1} hardMin={0} hardMax={cfg.endFrame}
                                highlight overrideText={cfg.startFrame.toFixed(0)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">End</label>
                        <div className="h-5 bg-surface-sunken rounded border border-line/10 relative">
                            <DraggableNumber
                                value={cfg.endFrame}
                                onChange={(v) => setCfg({ endFrame: Math.max(cfg.startFrame, Math.min(Math.round(v), durationFrames)) })}
                                step={1} hardMin={cfg.startFrame} hardMax={durationFrames}
                                highlight overrideText={cfg.endFrame.toFixed(0)}
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

                {showBitrate && (
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
                            : (isDiskMode ? 'Select Output File…' : 'Start RAM Render')
                    }
                    variant="primary"
                    fullWidth
                    disabled={
                        !isFormatSupported ||
                        (isStartDisabled?.({ cfg, extra, isDiskMode, isFormatSupported }) ?? false)
                    }
                    icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                />
            </div>
        </div>
    );
}
