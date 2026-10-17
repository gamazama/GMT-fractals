// In-progress export view — progress bar, ETA, settings summary,
// stop / resume / finish-early / discard controls. Lifted from
// fluid-toy and made generic.
//
// REMAINING is a range ("1m 20s – 1m 40s"), or - when the runner hands
// one figure as both ends (above 0) - "about" it, in whole minutes from
// a minute on ("about 3 min"): the deep zoomer's, from the frames it has
// made so far (2026-10-17). Every other runner hands a range.

import React from 'react';
import Button from '../../../components/Button';
import { PlayIcon, StopIcon, CheckIcon, TrashIcon } from '../../../components/Icons';
import { VIDEO_FORMATS } from '../../../data/constants';
import { formatTimeWithUnits } from '../../../components/timeline/exportHelpers';
import type { RenderDialogConfig } from './types';

/** One figure of time left, as the dialog says it: seconds under a minute, whole minutes under an hour. */
const aboutTime = (secs: number): string => {
    if (secs < 60) return `about ${Math.max(1, Math.round(secs))} s`;
    const m = Math.round(secs / 60);
    return m < 60 ? `about ${m} min` : `about ${Math.floor(m / 60)} h ${m % 60} min`;
};

export interface RenderingViewProps {
    onStop:           () => void;
    onResume:         () => void;
    onConfirmStitch:  () => void;
    onDiscard:        () => void;
    progress:         number; // 0..100
    statusText:       string;
    elapsedTime:      number;
    etaRange:         { min: number; max: number };
    lastFrameTime:    number;
    isStopping:       boolean;
    cfg:              RenderDialogConfig;
    showSamplesPerFrame: boolean;
    extraSummary?:    React.ReactNode;
    /** A run that writes frames into a folder (the install option `frameFolder`): one Cancel
     *  button, which is `onDiscard` - there is no file to finish early or to throw away, the
     *  frames written stay where they are - and a bar that does not pulse (a render on this
     *  thread's own GPU context should not be made to present the window every frame). */
    plain?:           boolean;
}

export const RenderingView: React.FC<RenderingViewProps> = ({
    onStop, onResume, onConfirmStitch, onDiscard,
    progress, statusText, elapsedTime, etaRange, lastFrameTime, isStopping,
    cfg, showSamplesPerFrame, extraSummary, plain = false,
}) => {
    const fmt = VIDEO_FORMATS[cfg.formatIndex];

    return (
        <div className="flex flex-col h-full space-y-4 p-2">
            <div className="space-y-1">
                <div className="flex justify-between items-baseline t-label-sm">
                    <span className="text-accent-300 font-bold">{progress.toFixed(1)}%</span>
                    <span className="text-[9px] text-fg-muted font-normal truncate max-w-[200px]">{statusText}</span>
                </div>
                <div className="h-3 w-full bg-surface-sunken rounded-full overflow-hidden border border-line/10">
                    {/* No transition on width — runners push setProgress
                     *  faster than 300ms in many cases (each call kicks
                     *  off a new tween that the next call interrupts at
                     *  a fraction of the way through), so the bar
                     *  visibly stalls. Snap to the latest value. */}
                    <div
                        className="h-full bg-gradient-to-r from-accent-600 to-accent-400 relative"
                        style={{ width: `${progress}%` }}
                    >
                        {!plain && <div className="absolute inset-0 bg-line/20 animate-pulse-live" />}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-line/5 p-3 rounded border border-line/5">
                <div className="flex flex-col">
                    <span className="t-label-sm text-fg-dim mb-0.5">Elapsed</span>
                    <span className="font-mono text-sm font-bold text-fg">{formatTimeWithUnits(elapsedTime)}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="t-label-sm text-fg-dim mb-0.5">Remaining</span>
                    <span className="font-mono text-sm font-bold text-accent-300" data-render-remaining>
                        {etaRange.max <= 0 ? '--'                    // nothing measured yet: not "0s – 0s"
                            : etaRange.min === etaRange.max
                                ? aboutTime(etaRange.min)
                                : `${formatTimeWithUnits(etaRange.min)} – ${formatTimeWithUnits(etaRange.max)}`}
                    </span>
                </div>
                <div className="flex flex-col pt-2 border-t border-line/5">
                    <span className="t-label-sm text-fg-dim mb-0.5">Last frame</span>
                    <span className={`font-mono text-xs ${lastFrameTime > 2.0 ? 'text-warn' : 'text-fg-tertiary'}`}>
                        {lastFrameTime.toFixed(2)}s
                    </span>
                </div>
                <div className="flex flex-col text-right pt-2 border-t border-line/5">
                    <span className="t-label-sm text-fg-dim mb-0.5">Total, about</span>
                    <span className="font-mono text-xs text-fg-tertiary">
                        {elapsedTime > 0 && progress > 0 ? formatTimeWithUnits(elapsedTime / (progress / 100)) : '--'}
                    </span>
                </div>
            </div>

            <div className="text-[9px] text-fg-dim grid grid-cols-2 gap-y-1 border-t border-line/5 pt-3">
                <span>Size: <span className="text-fg-tertiary">{cfg.width} x {cfg.height}</span></span>
                <span>What: <span className="text-fg-tertiary">{fmt?.label ?? '?'}</span></span>
                {showSamplesPerFrame && (
                    <span>Samples: <span className="text-fg-tertiary">{cfg.samplesPerFrame}</span></span>
                )}
                {extraSummary}
            </div>

            <div className="mt-auto pt-2">
                {plain ? (
                    <Button
                        onClick={onDiscard}
                        label="Cancel"
                        variant="danger"
                        icon={<StopIcon />}
                        fullWidth
                    />
                ) : !isStopping ? (
                    <Button
                        onClick={onStop}
                        label="Interrupt Render"
                        variant="danger"
                        icon={<StopIcon />}
                        fullWidth
                    />
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        <Button onClick={onResume}        label="Resume"  variant="primary" icon={<PlayIcon />} />
                        <Button onClick={onConfirmStitch} label="Finish"  variant="success" icon={<CheckIcon />} />
                        <Button onClick={onDiscard}       label="Discard" variant="danger"  icon={<TrashIcon />} />
                    </div>
                )}
            </div>
        </div>
    );
};
