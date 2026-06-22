import React, { memo, useMemo } from 'react';
import { TrackRow } from './TrackRow';
import { AnimationSequence } from '../../types';
import { FolderIcon } from '../Icons';
import { SelectionTransformBar } from './SelectionTransformBar';
import { useAnimationStore } from '../../store/animationStore';

interface TrackGroupProps {
    groupName: string;
    trackIds: string[];
    collapsed: boolean;
    onToggle: (name: string, isAlt: boolean) => void;
    sequence: AnimationSequence;
    frameWidth: number;
    selectedTrackIds: string[];
    selectedKeyframeIds: string[];
    onTrackSelect: (e: React.MouseEvent, tid: string) => void;
    onRemoveTrack: (tid: string) => void;
    onStartTransform?: (e: React.MouseEvent, type: 'move' | 'scale_left' | 'scale_right', minFrame: number, maxFrame: number) => void;
    visibleGraphTracks?: string[];
    onToggleVisibility?: (tid: string) => void;
    onSelectAllKeys?: (tid: string, multi: boolean) => void;
}

/** Collapsible group header + (when expanded) child track rows. Group diamonds
 *  now live on the shared DopeSheetCanvas overlay; this component renders the
 *  sidebar chrome and the SelectionTransformBar (still DOM — small, draggable,
 *  not part of the per-keyframe scaling problem). */
export const TrackGroup: React.FC<TrackGroupProps> = memo(({
    groupName, trackIds, collapsed, onToggle,
    sequence, frameWidth, selectedTrackIds, selectedKeyframeIds,
    onTrackSelect, onRemoveTrack,
    onStartTransform, visibleGraphTracks, onToggleVisibility, onSelectAllKeys,
}) => {
    const sidebarWidth = useAnimationStore(s => s.timelineSidebarWidth);

    // Group-local selection range — only selected keys whose track belongs to this group.
    // Reuses the global transform-bar mechanism (drags affect ALL selected keys, but the
    // bar appears near the user's actual selection rather than only on the global summary).
    const groupSelectionRange = useMemo(() => {
        const trackSet = new Set(trackIds);
        let min = Infinity;
        let max = -Infinity;
        let count = 0;
        selectedKeyframeIds.forEach(cid => {
            const [tid, kid] = cid.split('::');
            if (!trackSet.has(tid)) return;
            const k = sequence.tracks[tid]?.keyframes.find(kf => kf.id === kid);
            if (k) {
                if (k.frame < min) min = k.frame;
                if (k.frame > max) max = k.frame;
                count++;
            }
        });
        return count >= 2 ? { min, max } : null;
    }, [selectedKeyframeIds, trackIds, sequence]);

    return (
        <>
            <div
                className="flex border-b border-line/5 bg-line/10"
                style={{ height: 24 }}
            >
                <div
                    // z-30 matches TrackRow's sticky sidebar so the group header sits above scrolling keyframes.
                    className="sticky left-0 z-30 bg-surface-raised border-r border-line/10 shrink-0 flex items-center px-2 cursor-pointer hover:bg-fg-ghost select-none"
                    style={{ width: sidebarWidth }}
                    onClick={(e) => { e.stopPropagation(); onToggle(groupName, e.altKey); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-help-id="anim.tracks"
                >
                    <span className="text-fg-dim w-4"><FolderIcon open={!collapsed} /></span>
                    <span className="text-[10px] font-bold text-fg-tertiary">{groupName}</span>
                </div>
                {/* Keyframe area: group diamonds now live on the shared DopeSheetCanvas overlay.
                    pointer-events:none lets the empty row fall through to the canvas hit-test;
                    SelectionTransformBar overrides back to pointer-events:auto for its handles. */}
                <div className="flex-1 relative group/track" style={{ pointerEvents: 'none' }}>
                    {groupSelectionRange && onStartTransform && (
                        <SelectionTransformBar
                            minFrame={groupSelectionRange.min}
                            maxFrame={groupSelectionRange.max}
                            frameWidth={frameWidth}
                            onStart={onStartTransform}
                        />
                    )}
                </div>
            </div>

            {!collapsed && trackIds.map(tid => (
                <TrackRow
                    key={tid}
                    tid={tid}
                    sequence={sequence}
                    isSelected={selectedTrackIds.includes(tid)}
                    isVisible={visibleGraphTracks?.includes(tid)}
                    onSelect={onTrackSelect}
                    onToggleVisibility={onToggleVisibility}
                    onSelectAllKeys={onSelectAllKeys}
                    onRemove={() => onRemoveTrack(tid)}
                />
            ))}
        </>
    );
});
