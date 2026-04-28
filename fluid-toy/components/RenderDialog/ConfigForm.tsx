/**
 * Pre-render settings form for fluid-toy's video export. Pure
 * presentational — every value comes in as a prop, every change goes
 * back out via a setter.
 */

import React from 'react';
import Slider, { DraggableNumber } from '../../../components/Slider';
import Dropdown from '../../../components/Dropdown';
import Button from '../../../components/Button';
import { PlayIcon, SaveIcon, AlertIcon } from '../../../components/Icons';
import { VIDEO_FORMATS } from '../../../data/constants';

export interface ConfigFormProps {
    onStart: () => void;

    width:           number;
    setWidth:        (n: number) => void;
    height:          number;
    setHeight:       (n: number) => void;
    formatIndex:     number;
    setFormatIndex:  (n: number) => void;
    samplesPerFrame: number;
    setSamplesPerFrame: (n: number) => void;
    bitrate:         number;
    setBitrate:      (n: number) => void;
    startFrame:      number;
    setStartFrame:   (n: number) => void;
    endFrame:        number;
    setEndFrame:     (n: number) => void;
    frameStep:       number;
    setFrameStep:    (n: number) => void;
    fps:             number;

    durationFrames:    number;
    isFormatSupported: boolean;
    formatSupportError: string | null;
    isDiskMode:        boolean;
}

const RES_PRESETS: { label: string; w: number; h: number }[] = [
    { label: '720p HD (16:9)',   w: 1280, h: 720  },
    { label: '1080p FHD (16:9)', w: 1920, h: 1080 },
    { label: '1440p QHD (16:9)', w: 2560, h: 1440 },
    { label: '4K UHD (16:9)',    w: 3840, h: 2160 },
    { label: 'Square 1:1',       w: 1080, h: 1080 },
    { label: 'Vertical 9:16',    w: 1080, h: 1920 },
];

export const ConfigForm: React.FC<ConfigFormProps> = (props) => {
    const {
        onStart,
        width, setWidth, height, setHeight,
        formatIndex, setFormatIndex,
        samplesPerFrame, setSamplesPerFrame,
        bitrate, setBitrate,
        startFrame, setStartFrame, endFrame, setEndFrame, frameStep, setFrameStep,
        fps, durationFrames, isFormatSupported, formatSupportError, isDiskMode,
    } = props;

    const currentFormat = VIDEO_FORMATS[formatIndex];
    // Hide image-sequence formats — fluid-toy v1 is video-only.
    const formatOptions = VIDEO_FORMATS
        .map((f, i) => ({ label: f.label, value: i }))
        .filter((_, i) => !VIDEO_FORMATS[i].imageSequence);

    const presetValue = `${width}x${height}`;
    const presetOptions = [
        ...RES_PRESETS.map((p) => ({ label: `${p.label} (${p.w}x${p.h})`, value: `${p.w}x${p.h}` })),
        // Always offer the current custom value so the dropdown can display it.
        ...(RES_PRESETS.some((p) => p.w === width && p.h === height)
            ? []
            : [{ label: `Custom (${width}x${height})`, value: presetValue }]),
    ];

    const totalFrames = Math.floor((endFrame - startFrame) / Math.max(1, frameStep)) + 1;
    const durationSec = totalFrames / fps;

    return (
        <div className="flex flex-col -m-3 h-[calc(100%+20px)]">
            <div className="px-3 py-1 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0">
                <span className="t-label">{currentFormat.container.toUpperCase()} • {currentFormat.codec.toUpperCase()} • {fps} FPS</span>
                <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isDiskMode ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-amber-900/30 text-amber-400 border-amber-500/30'}`}
                    title={isDiskMode ? 'Direct disk write' : 'In-memory buffer (large videos may exceed RAM)'}
                >
                    {isDiskMode ? 'DISK' : 'RAM'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-1.5 space-y-1">
                <Dropdown
                    label="Resolution"
                    value={presetValue}
                    onChange={(v) => {
                        const [w, h] = (v as string).split('x').map(Number);
                        setWidth(w);
                        setHeight(h);
                    }}
                    options={presetOptions}
                    className="mb-1.5"
                />

                <div className="flex gap-1 mb-1.5">
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">Width</label>
                        <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                            <DraggableNumber
                                value={width}
                                onChange={(v) => setWidth(Math.max(32, Math.round(v)))}
                                step={2}
                                overrideText={width.toFixed(0)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">Height</label>
                        <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                            <DraggableNumber
                                value={height}
                                onChange={(v) => setHeight(Math.max(32, Math.round(v)))}
                                step={2}
                                overrideText={height.toFixed(0)}
                            />
                        </div>
                    </div>
                </div>

                <Dropdown
                    label="Format"
                    value={formatIndex}
                    onChange={(v) => setFormatIndex(Number(v))}
                    options={formatOptions}
                    className="mb-1.5"
                />

                {!isFormatSupported && (
                    <div className="mx-1 mb-2 p-1.5 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2 text-[9px] text-red-300">
                        <AlertIcon />
                        <span>{formatSupportError ?? 'Format incompatible with browser/GPU.'}</span>
                    </div>
                )}

                <div className="flex gap-1">
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">Start</label>
                        <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                            <DraggableNumber
                                value={startFrame}
                                onChange={(v) => setStartFrame(Math.max(0, Math.min(Math.round(v), endFrame)))}
                                step={1} highlight overrideText={startFrame.toFixed(0)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="t-label mb-0.5 block">End</label>
                        <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                            <DraggableNumber
                                value={endFrame}
                                onChange={(v) => setEndFrame(Math.max(startFrame, Math.min(Math.round(v), durationFrames)))}
                                step={1} highlight overrideText={endFrame.toFixed(0)}
                            />
                        </div>
                    </div>
                    <div className="flex-[0.7]">
                        <label className="t-label mb-0.5 block">Step</label>
                        <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                            <DraggableNumber
                                value={frameStep}
                                onChange={(v) => setFrameStep(Math.max(1, Math.round(v)))}
                                step={1} min={1} overrideText={frameStep.toFixed(0)}
                            />
                        </div>
                    </div>
                </div>

                <Slider
                    label="Bitrate (Mbps)"
                    value={bitrate}
                    min={1} max={100} step={1}
                    onChange={setBitrate}
                    overrideInputText={`${bitrate}`}
                />

                <Slider
                    label="Samples / Frame"
                    value={samplesPerFrame}
                    min={1} max={256} step={1}
                    onChange={setSamplesPerFrame}
                    overrideInputText={samplesPerFrame.toFixed(0)}
                />
                <div className="px-2 -mt-1 mb-1 text-[8px] text-gray-500 leading-tight">
                    TSAA samples per output frame. Higher = cleaner fractal but slower export.
                </div>

                <div className="flex flex-col gap-1 px-2 py-1.5 mt-2 bg-white/5 rounded border border-white/5 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-400">Frames</span><span className="font-mono text-gray-200">{totalFrames}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="font-mono text-cyan-300">{durationSec.toFixed(2)}s</span></div>
                </div>
            </div>

            <div className="p-1.5 bg-gray-900/50 border-t border-white/10 shrink-0">
                <Button
                    onClick={onStart}
                    label={isDiskMode ? 'Select Output File…' : 'Start RAM Render'}
                    variant="primary"
                    fullWidth
                    disabled={!isFormatSupported}
                    icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                />
            </div>
        </div>
    );
};
