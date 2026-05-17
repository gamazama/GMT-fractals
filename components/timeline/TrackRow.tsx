import React, { memo, useMemo, useRef, useEffect } from 'react';
import { AnimationSequence } from '../../types';
import { useAnimationStore } from '../../store/animationStore';
import { useHelpContextMenu } from '../../hooks/useHelpContextMenu';
import { TrashIcon, EyeIcon, SelectAllIcon } from '../Icons';

export { isFlatTrack } from '../../utils/dopeSheetTrackFlags';
import { isFlatTrack } from '../../utils/dopeSheetTrackFlags';

// LiveValueDisplay registry. Populated when each row's value badge mounts; consumers
// outside this file (e.g. a future shared RAF tick) can read the entries to push
// updated text into the spans without going through React. Empty / unread on dev
// at the moment of this writing — the previous TrackRow.tick() that read it was
// dead code per docs/animation-refactor/15_DOPESHEET_PROBE_FINDINGS.md — but the
// sidebar badge stays mounted so a re-wired live-value loop has an attach point.
export const liveValueState = {
    displays: new Map<string, HTMLSpanElement>(),
};

const LiveValueDisplay = ({ tid }: { tid: string }) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) liveValueState.displays.set(tid, ref.current);
        return () => { liveValueState.displays.delete(tid); };
    }, [tid]);

    return (
        <span ref={ref} className="text-[9px] font-mono text-gray-600 w-12 text-right">
            --
        </span>
    );
};

interface TrackRowProps {
    tid: string;
    sequence: AnimationSequence;
    isSelected: boolean;
    isVisible?: boolean;
    onSelect: (e: React.MouseEvent, tid: string) => void;
    onToggleVisibility?: (tid: string) => void;
    onSelectAllKeys?: (tid: string, multi: boolean) => void;
    onRemove: () => void;
}

/** Sidebar row for a single track — label, select-all, live-value badge, eye toggle,
 *  trash. The keyframe area now lives on the shared DopeSheetCanvas overlay; this
 *  component renders only the sticky-left sidebar column. */
export const TrackRow: React.FC<TrackRowProps> = memo(({
    tid, sequence, isSelected, isVisible,
    onSelect, onToggleVisibility, onSelectAllKeys, onRemove,
}) => {
    const handleContextMenu = useHelpContextMenu();
    const sidebarWidth = useAnimationStore(s => s.timelineSidebarWidth);
    const track = sequence.tracks[tid];
    const flat = useMemo(() => isFlatTrack(track?.keyframes ?? []), [track?.keyframes]);

    return (
        <div
            className={`flex border-b border-white/5 bg-transparent hover:bg-white/5 ${flat ? 'opacity-50' : ''}`}
            style={{ height: 32 }}
            data-help-id="anim.tracks"
        >
            <div
                className={`sticky left-0 z-30 bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${isSelected ? 'border-l-2 border-l-cyan-500' : ''}`}
                style={{ width: sidebarWidth }}
                onClick={(e) => onSelect(e, tid)}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={handleContextMenu}
                data-help-id="anim.tracks"
            >
                <div className="truncate text-[10px] font-bold text-gray-400 group-hover:text-cyan-400 pl-4" title={sequence.tracks[tid].label}>
                    {sequence.tracks[tid].label}
                </div>
                <div className="flex items-center gap-1.5">
                    {onSelectAllKeys && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelectAllKeys(tid, e.shiftKey || e.ctrlKey || e.metaKey); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-500 hover:text-cyan-400 hover:bg-white/10"
                            title="Select all keys on this track"
                        >
                            <SelectAllIcon />
                        </button>
                    )}
                    <LiveValueDisplay tid={tid} />
                    {onToggleVisibility && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(tid); }}
                            className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/10"
                            title={isVisible ? 'Hide in graph' : 'Show in graph'}
                        >
                            <EyeIcon active={!!isVisible} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"><TrashIcon /></button>
                </div>
            </div>
            {/* Keyframe area: diamonds, double-click-to-add, and right-click context
                menu now live on the shared DopeSheetCanvas overlay. pointer-events:none
                lets clicks fall through to the canvas hit-test. */}
            <div
                className="flex-1 relative group/track"
                style={{ pointerEvents: 'none' }}
            />
        </div>
    );
});
