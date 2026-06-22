import React, { memo, useMemo } from 'react';
import { AnimationSequence } from '../../types';
import { useAnimationStore } from '../../store/animationStore';
import { useHelpContextMenu } from '../../hooks/useHelpContextMenu';
import { TrashIcon, EyeIcon, SelectAllIcon } from '../Icons';
import { isFlatTrack } from '../../utils/dopeSheetTrackFlags';

const LiveValueDisplay = () => (
    <span className="text-[9px] font-mono text-fg-faint w-12 text-right">--</span>
);

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
            className={`flex border-b border-line/5 bg-transparent hover:bg-line/5 ${flat ? 'opacity-50' : ''}`}
            style={{ height: 32 }}
            data-help-id="anim.tracks"
        >
            <div
                className={`sticky left-0 z-30 bg-surface/80 backdrop-blur-sm border-r border-line/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${isSelected ? 'border-l-2 border-l-accent-500' : ''}`}
                style={{ width: sidebarWidth }}
                onClick={(e) => onSelect(e, tid)}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={handleContextMenu}
                data-help-id="anim.tracks"
            >
                <div className="truncate text-[10px] font-bold text-fg-muted group-hover:text-accent-400 pl-4" title={sequence.tracks[tid].label}>
                    {sequence.tracks[tid].label}
                </div>
                <div className="flex items-center gap-1.5">
                    {onSelectAllKeys && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelectAllKeys(tid, e.shiftKey || e.ctrlKey || e.metaKey); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-fg-dim hover:text-accent-400 hover:bg-line/10"
                            title="Select all keys on this track"
                        >
                            <SelectAllIcon />
                        </button>
                    )}
                    <LiveValueDisplay />
                    {onToggleVisibility && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(tid); }}
                            className="p-0.5 rounded text-fg-dim hover:text-fg hover:bg-line/10"
                            title={isVisible ? 'Hide in graph' : 'Show in graph'}
                        >
                            <EyeIcon active={!!isVisible} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-danger hover:text-danger"><TrashIcon /></button>
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
