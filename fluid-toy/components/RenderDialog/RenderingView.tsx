/**
 * In-progress export view — progress bar, ETA, settings summary,
 * stop / resume / finish-early / discard controls. Mounts whenever
 * `isRendering` is true on the parent dialog.
 */

import React from 'react';
import Button from '../../../components/Button';
import { PlayIcon, StopIcon, CheckIcon, TrashIcon } from '../../../components/Icons';
import { VIDEO_FORMATS } from '../../../data/constants';
import { formatTimeWithUnits } from './timeFormat';

export interface RenderingViewProps {
    onStop:           () => void;
    onResume:         () => void;
    onConfirmStitch:  () => void;
    onDiscard:        () => void;
    progress:         number;
    statusText:       string;
    elapsedTime:      number;
    etaRange:         { min: number; max: number };
    lastFrameTime:    number;
    isStopping:       boolean;
    width:            number;
    height:           number;
    formatIndex:      number;
    samplesPerFrame:  number;
}

export const RenderingView: React.FC<RenderingViewProps> = ({
    onStop, onResume, onConfirmStitch, onDiscard,
    progress, statusText, elapsedTime, etaRange, lastFrameTime, isStopping,
    width, height, formatIndex, samplesPerFrame,
}) => {
    const fmt = VIDEO_FORMATS[formatIndex];

    return (
        <div className="flex flex-col h-full space-y-4 p-2">
            <div className="space-y-1">
                <div className="flex justify-between items-baseline t-label-sm">
                    <span className="text-cyan-300 font-bold">{progress.toFixed(1)}%</span>
                    <span className="text-[9px] text-gray-400 font-normal truncate max-w-[200px]">{statusText}</span>
                </div>
                <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded border border-white/5">
                <div className="flex flex-col">
                    <span className="t-label-sm text-gray-500 mb-0.5">Elapsed</span>
                    <span className="font-mono text-sm font-bold text-white">{formatTimeWithUnits(elapsedTime)}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="t-label-sm text-gray-500 mb-0.5">Remaining</span>
                    <span className="font-mono text-sm font-bold text-cyan-300">
                        {formatTimeWithUnits(etaRange.min)} – {formatTimeWithUnits(etaRange.max)}
                    </span>
                </div>
                <div className="flex flex-col pt-2 border-t border-white/5">
                    <span className="t-label-sm text-gray-500 mb-0.5">Last Frame</span>
                    <span className={`font-mono text-xs ${lastFrameTime > 2.0 ? 'text-amber-400' : 'text-gray-300'}`}>
                        {lastFrameTime.toFixed(2)}s
                    </span>
                </div>
                <div className="flex flex-col text-right pt-2 border-t border-white/5">
                    <span className="t-label-sm text-gray-500 mb-0.5">Est. Total</span>
                    <span className="font-mono text-xs text-gray-300">
                        {elapsedTime > 0 && progress > 0 ? formatTimeWithUnits(elapsedTime / (progress / 100)) : '--'}
                    </span>
                </div>
            </div>

            <div className="text-[9px] text-gray-500 grid grid-cols-2 gap-y-1 border-t border-white/5 pt-3">
                <span>Resolution: <span className="text-gray-300">{width}x{height}</span></span>
                <span>Format: <span className="text-gray-300">{fmt?.label.split(' ')[0] ?? '?'}</span></span>
                <span>Samples: <span className="text-gray-300">{samplesPerFrame}</span></span>
            </div>

            <div className="mt-auto pt-2">
                {!isStopping ? (
                    <Button
                        onClick={onStop}
                        label="Interrupt Render"
                        variant="danger"
                        icon={<StopIcon />}
                        fullWidth
                    />
                ) : (
                    <div className="grid grid-cols-3 gap-2 animate-fade-in">
                        <Button onClick={onResume}        label="Resume"  variant="primary" icon={<PlayIcon />} />
                        <Button onClick={onConfirmStitch} label="Finish"  variant="success" icon={<CheckIcon />} />
                        <Button onClick={onDiscard}       label="Discard" variant="danger"  icon={<TrashIcon />} />
                    </div>
                )}
            </div>
        </div>
    );
};
