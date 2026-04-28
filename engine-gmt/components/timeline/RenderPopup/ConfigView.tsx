/**
 * Config UI shown before a render starts — resolution / format / passes
 * / range / bitrate / samples / scale, plus the "Start Render" action.
 *
 * Pure presentational: every value comes in as a prop, every change
 * goes back out via a setter. Parent owns the state.
 */

import React from 'react';
import DraggableWindow from '../../../../components/DraggableWindow';
import Slider, { DraggableNumber } from '../../../../components/Slider';
import Dropdown from '../../../../components/Dropdown';
import Button from '../../../../components/Button';
import { PlayIcon, SaveIcon, AlertIcon } from '../../../../components/Icons';
import { VIDEO_FORMATS } from '../../../../data/constants';
import { useEngineStore } from '../../../../store/engineStore';
import { formatDurationMs, formatTimeWithUnits } from '../exportHelpers';

export interface ConfigViewProps {
    onClose: () => void;
    onStart: () => void;

    // Form state
    vidRes:        { w: number; h: number };
    setVidRes:     (v: { w: number; h: number }) => void;
    formatIndex:   number;
    setFormatIndex:(n: number) => void;
    vidSamples:    number;
    setVidSamples: (n: number) => void;
    vidBitrate:    number;
    setVidBitrate: (n: number) => void;
    startFrame:    number;
    setStartFrame: (n: number) => void;
    endFrame:      number;
    setEndFrame:   (n: number) => void;
    frameStep:     number;
    setFrameStep:  (n: number) => void;
    internalScale: number;
    setInternalScale: (n: number) => void;
    exportBeauty:  boolean;
    setExportBeauty: (b: boolean) => void;
    exportAlpha:   boolean;
    setExportAlpha: (b: boolean) => void;
    exportDepth:   boolean;
    setExportDepth: (b: boolean) => void;
    depthMin:      number;
    setDepthMin:   (n: number) => void;
    depthMax:      number;
    setDepthMax:   (n: number) => void;

    // Derived / readouts
    fps: number;
    durationFrames: number;
    isFormatSupported: boolean;
    isFirefoxH264BitrateCapped: boolean;
    isDiskMode: boolean;
    diskModeTooltip: string;
    frameStats: { duration: number; progress: number };
    estTotalSeconds: number;
    resOptions: { label: string; value: string }[];

    // Window state
    winPos:    { x: number; y: number };
    setWinPos: (p: { x: number; y: number }) => void;
    winSize:   { width: number; height: number };
    setWinSize:(s: { width: number; height: number }) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = (props) => {
    const {
        onClose, onStart,
        vidRes, setVidRes, formatIndex, setFormatIndex,
        vidSamples, setVidSamples, vidBitrate, setVidBitrate,
        startFrame, setStartFrame, endFrame, setEndFrame, frameStep, setFrameStep,
        internalScale, setInternalScale,
        exportBeauty, setExportBeauty, exportAlpha, setExportAlpha,
        exportDepth, setExportDepth, depthMin, setDepthMin, depthMax, setDepthMax,
        fps, durationFrames, isFormatSupported, isFirefoxH264BitrateCapped,
        isDiskMode, diskModeTooltip, frameStats, estTotalSeconds, resOptions,
        winPos, setWinPos, winSize, setWinSize,
    } = props;

    const currentFormat = VIDEO_FORMATS[formatIndex];
    const formatOptions = VIDEO_FORMATS.map((f, i) => ({ label: f.label, value: i }));

    return (
        <DraggableWindow
            title="Render Sequence"
            onClose={onClose}
            position={winPos}
            onPositionChange={setWinPos}
            size={winSize}
            onSizeChange={setWinSize}
            disableClose={false}
            zIndex={600}
        >
            <div className="flex flex-col -m-3 h-[calc(100%+20px)]">
                {/* Header info */}
                <div className="px-3 py-1 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0">
                    <span className="t-label">{currentFormat.container.toUpperCase()} • {currentFormat.codec.toUpperCase()} • {fps} FPS</span>
                    <div className="flex items-center gap-2">
                        <div
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded border cursor-help ${isDiskMode ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-amber-900/30 text-amber-400 border-amber-500/30'}`}
                            title={diskModeTooltip}
                        >
                            {isDiskMode ? 'DISK MODE' : 'RAM MODE'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0">
                    <div className="w-full flex flex-col h-full">
                        <div className="flex-1 transition-all duration-300 overflow-y-auto custom-scroll">
                            <div className="p-1.5 space-y-1">
                                <Dropdown
                                    label="Resolution"
                                    value={`${vidRes.w}x${vidRes.h}`}
                                    onChange={(val) => {
                                        const [w, h] = (val as string).split('x').map(Number);
                                        setVidRes({ w, h });
                                    }}
                                    options={resOptions}
                                    className="mb-1.5"
                                />

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
                                        <span>Format incompatible with browser/GPU.</span>
                                    </div>
                                )}

                                <div className="px-1 mb-1.5">
                                    <label className="t-label mb-0.5 block">Passes</label>
                                    <div className="flex gap-3 items-center">
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input type="checkbox" checked={exportBeauty} onChange={(e) => setExportBeauty(e.target.checked)} className="accent-cyan-400" />
                                            Beauty
                                        </label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input type="checkbox" checked={exportAlpha} onChange={(e) => setExportAlpha(e.target.checked)} className="accent-cyan-400" />
                                            Alpha
                                        </label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input type="checkbox" checked={exportDepth} onChange={(e) => setExportDepth(e.target.checked)} className="accent-cyan-400" />
                                            Depth
                                        </label>
                                    </div>
                                    {(exportAlpha || exportDepth) && (exportBeauty ? 1 : 0) + (exportAlpha ? 1 : 0) + (exportDepth ? 1 : 0) > 1 && (
                                        <div className="text-[8px] text-gray-500 mt-0.5 leading-tight">
                                            One file per pass, named {'{project}'}_{'{pass}'}_{'v{n}'}.{currentFormat.ext}
                                        </div>
                                    )}
                                    {exportDepth && (
                                        <div className="mt-1.5 pt-1 border-t border-white/5">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <label className="t-label">Depth range (world units)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const atm = (useEngineStore.getState() as any).atmosphere;
                                                        if (!atm || !(atm.fogIntensity > 0)) return;
                                                        setDepthMin(atm.fogNear ?? 0);
                                                        setDepthMax(atm.fogFar ?? 5);
                                                    }}
                                                    disabled={!((useEngineStore.getState() as any).atmosphere?.fogIntensity > 0)}
                                                    className="text-[9px] text-cyan-300 hover:text-cyan-200 disabled:text-gray-600 disabled:cursor-not-allowed underline-offset-2 hover:underline"
                                                    title="Copy the atmosphere feature's fog start/end into the depth range (only available when fog is enabled)."
                                                >
                                                    Use fog range
                                                </button>
                                            </div>
                                            <div className="flex gap-1">
                                                <div className="flex-1">
                                                    <label className="t-label mb-0.5 block">Near</label>
                                                    <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                        <DraggableNumber
                                                            value={depthMin}
                                                            onChange={(v) => setDepthMin(Math.max(0, Math.min(v, depthMax - 0.001)))}
                                                            step={0.1}
                                                            overrideText={depthMin.toFixed(2)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="t-label mb-0.5 block">Far</label>
                                                    <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                        <DraggableNumber
                                                            value={depthMax}
                                                            onChange={(v) => setDepthMax(Math.max(depthMin + 0.001, v))}
                                                            step={0.1}
                                                            overrideText={depthMax.toFixed(2)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                    value={vidBitrate}
                                    min={1} max={100} step={1}
                                    onChange={setVidBitrate}
                                    overrideInputText={`${vidBitrate}`}
                                />

                                {isFirefoxH264BitrateCapped && (
                                    <div className="px-2 -mt-1 mb-1 text-[9px] text-amber-400/90 leading-tight">
                                        Firefox caps H.264 output at ~31 Mbps regardless of this setting.
                                    </div>
                                )}

                                <Slider
                                    label="Samples (Quality)"
                                    value={vidSamples}
                                    min={1} max={256} step={1}
                                    onChange={setVidSamples}
                                    overrideInputText={vidSamples.toFixed(0)}
                                />

                                <Slider
                                    label="Internal Scale (SSAA)"
                                    value={internalScale}
                                    min={1.0} max={2.0} step={0.1}
                                    onChange={setInternalScale}
                                    overrideInputText={`${internalScale}x`}
                                    highlight={internalScale > 1.0}
                                />
                                <div className="px-2 text-[8px] text-gray-500 mb-2">
                                    Use 1.5x or 2.0x for sharper details (Supersampling).
                                </div>

                                {isDiskMode && (
                                    <div className="px-2 py-1 mx-2 mb-1 bg-green-900/10 border border-green-500/20 rounded">
                                        <p className="text-[8px] text-green-400 leading-tight">
                                            Disk Mode Active: You can render unlimited video sizes.
                                        </p>
                                    </div>
                                )}

                                <div className="p-1.5 pt-0.5 space-y-1">
                                    <div className="relative flex justify-between items-center px-2 py-0.5 bg-white/5 rounded border border-white/5 overflow-hidden group">
                                        <div
                                            className="absolute inset-0 bg-cyan-500/10 origin-left transition-transform duration-75 ease-linear pointer-events-none"
                                            style={{ transform: `scaleX(${frameStats.progress})` }}
                                        />
                                        <span className="t-label-sm relative z-10 text-gray-400">Viewport Sample</span>
                                        <span className={`text-[10px] font-mono font-bold relative z-10 ${frameStats.duration > 0 ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                                            {frameStats.duration > 0 ? formatDurationMs(frameStats.duration) : 'Estimating...'}
                                        </span>
                                    </div>

                                    {frameStats.duration > 0 && (
                                        <div className="flex flex-col gap-1 px-1 bg-white/5 rounded border border-white/5 p-2">
                                            <div className="flex justify-between items-center t-label-sm">
                                                <span>Est. Total</span>
                                                <span className="font-mono text-cyan-300">{formatTimeWithUnits(estTotalSeconds)}</span>
                                            </div>
                                            <p className="text-[8px] text-gray-500 italic leading-tight">
                                                Calculated based on target resolution pixels vs current viewport.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-1.5 bg-gray-900/50 border-t border-white/10 shrink-0">
                            <Button
                                onClick={onStart}
                                label={
                                    currentFormat.imageSequence
                                        ? (isDiskMode ? 'Select Output Folder…' : 'Image Sequence Requires Chrome')
                                        : (isDiskMode ? 'Select Output File…' : 'Start RAM Render')
                                }
                                variant="primary"
                                fullWidth
                                disabled={
                                    !isFormatSupported
                                    || (!exportBeauty && !exportAlpha && !exportDepth)
                                    || (currentFormat.imageSequence && !isDiskMode)
                                }
                                icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                            />
                            {currentFormat.imageSequence && !isDiskMode && (
                                <div className="mt-1.5 px-2 text-[9px] text-amber-400/90 leading-tight">
                                    Image sequences need the File System Access API (directory picker), available in Chrome / Edge.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
