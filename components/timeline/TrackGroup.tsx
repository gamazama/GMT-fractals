
import React, { memo, useRef, useEffect, useMemo } from 'react';
import { TrackRow, groupDiamondState } from './TrackRow';
import { AnimationSequence } from '../../types';
import { FolderIcon } from '../Icons';
import { SelectionTransformBar } from './SelectionTransformBar';
import { useAnimationStore } from '../../store/animationStore';

// Group diamond that registers with tick system for dirty-state coloring
const GroupDiamond = ({ groupName, frame, frameWidth, tids, onMouseDown }: {
    groupName: string;
    frame: number;
    frameWidth: number;
    tids: string[];
    onMouseDown: (e: React.MouseEvent) => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const compositeKey = `${groupName}::${frame}`;

    useEffect(() => {
        if (ref.current) {
            groupDiamondState.diamonds.set(compositeKey, { el: ref.current, frame, tids });
        }
        return () => { groupDiamondState.diamonds.delete(compositeKey); };
    }, [compositeKey, frame, tids]);

    return (
        <div
            ref={ref}
            className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-gray-500/50 border border-gray-400/50 rotate-45 cursor-grab hover:bg-white hover:border-white hover:scale-125 z-10"
            style={{ left: `${frame * frameWidth - 6}px` }}
            onMouseDown={onMouseDown}
            data-help-id="anim.keyframes"
        />
    );
};

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
    onAddKey: (tid: string, frame: number) => void;
    onKeyMouseDown: (e: React.MouseEvent, tid: string, kid: string) => void;
    onGroupKeyMouseDown: (e: React.MouseEvent, tids: string[], frame: number) => void;
    onStartTransform?: (e: React.MouseEvent, type: 'move' | 'scale_left' | 'scale_right', minFrame: number, maxFrame: number) => void;
    visibleGraphTracks?: string[];
    onToggleVisibility?: (tid: string) => void;
    onSelectAllKeys?: (tid: string, multi: boolean) => void;
    /** Visible scroll-content extent in px — keyframe diamonds outside this
     *  window are skipped at render time. */
    visibleMinPx?: number;
    visibleMaxPx?: number;
}

export const TrackGroup: React.FC<TrackGroupProps> = memo(({
    groupName, trackIds, collapsed, onToggle,
    sequence, frameWidth, selectedTrackIds, selectedKeyframeIds,
    onTrackSelect, onRemoveTrack, onAddKey, onKeyMouseDown, onGroupKeyMouseDown,
    onStartTransform, visibleGraphTracks, onToggleVisibility, onSelectAllKeys,
    visibleMinPx, visibleMaxPx
}) => {
    const sidebarWidth = useAnimationStore(s => s.timelineSidebarWidth);

    // Group summary keyframes — restricted to the visible scroll viewport so
    // long recordings (1000+ keys) don't pay layout/paint cost on every off-
    // screen GroupDiamond.
    const groupKeyframes = useMemo(() => {
        const buffer = 64;
        const useViewport = visibleMinPx != null && visibleMaxPx != null && frameWidth > 0;
        const minFrame = useViewport ? Math.max(0, (visibleMinPx! - buffer) / frameWidth) : -Infinity;
        const maxFrame = useViewport ? (visibleMaxPx! + buffer) / frameWidth :  Infinity;
        const frameSet = new Set<number>();
        trackIds.forEach(tid => {
            const t = sequence.tracks[tid];
            if (!t) return;
            for (const k of t.keyframes) {
                if (k.frame >= minFrame && k.frame <= maxFrame) frameSet.add(k.frame);
            }
        });
        return Array.from(frameSet).sort((a, b) => a - b);
    }, [trackIds, sequence, frameWidth, visibleMinPx, visibleMaxPx]);

    // Group-local selection range: only selected keys whose track is in this group.
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
                className="flex border-b border-white/5 bg-white/10"
                style={{ height: 24 }}
            >
                <div
                    // Increase Z-Index to 30 to match TrackRow sticky header, ensuring it sits above scrolling keyframes
                    className="sticky left-0 z-30 bg-[#1a1a1a] border-r border-white/10 shrink-0 flex items-center px-2 cursor-pointer hover:bg-gray-700 select-none"
                    style={{ width: sidebarWidth }}
                    onClick={(e) => { e.stopPropagation(); onToggle(groupName, e.altKey); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-help-id="anim.tracks"
                >
                    <span className="text-gray-500 w-4"><FolderIcon open={!collapsed} /></span>
                    <span className="text-[10px] font-bold text-gray-300">{groupName}</span>
                </div>
                <div className="flex-1 relative group/track">
                    {groupKeyframes.map(frame => (
                        <GroupDiamond
                            key={frame}
                            groupName={groupName}
                            frame={frame}
                            frameWidth={frameWidth}
                            tids={trackIds}
                            onMouseDown={(e) => onGroupKeyMouseDown(e, trackIds, frame)}
                        />
                    ))}
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
                    frameWidth={frameWidth}
                    isSelected={selectedTrackIds.includes(tid)}
                    isVisible={visibleGraphTracks?.includes(tid)}
                    selectedKeys={selectedKeyframeIds}
                    onSelect={onTrackSelect}
                    onToggleVisibility={onToggleVisibility}
                    onSelectAllKeys={onSelectAllKeys}
                    onRemove={() => onRemoveTrack(tid)}
                    onAddKey={(f) => onAddKey(tid, f)}
                    onKeyMouseDown={onKeyMouseDown}
                    visibleMinPx={visibleMinPx}
                    visibleMaxPx={visibleMaxPx}
                />
            ))}
        </>
    );
});
