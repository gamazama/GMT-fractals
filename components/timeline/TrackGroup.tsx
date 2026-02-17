
import React, { memo } from 'react';
import { TrackRow } from './TrackRow';
import { AnimationSequence } from '../../types';
import { FolderIcon } from '../Icons';

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
}

export const TrackGroup: React.FC<TrackGroupProps> = memo(({
    groupName, trackIds, collapsed, onToggle,
    sequence, frameWidth, selectedTrackIds, selectedKeyframeIds,
    onTrackSelect, onRemoveTrack, onAddKey, onKeyMouseDown, onGroupKeyMouseDown
}) => {
    
    // Calculate group summary keyframes
    const groupKeyframes = React.useMemo(() => {
        const frameSet = new Set<number>();
        trackIds.forEach(tid => {
            const t = sequence.tracks[tid];
            if(t) t.keyframes.forEach(k => frameSet.add(k.frame));
        });
        return Array.from(frameSet).sort((a,b) => a-b);
    }, [trackIds, sequence]);

    return (
        <>
            <div 
                className="flex border-b border-white/5 bg-white/10"
                style={{ height: 24 }}
            >
                <div 
                    // Increase Z-Index to 30 to match TrackRow sticky header, ensuring it sits above scrolling keyframes
                    className="sticky left-0 z-30 w-[220px] bg-[#1a1a1a] border-r border-white/10 shrink-0 flex items-center px-2 cursor-pointer hover:bg-gray-700 select-none" 
                    onClick={(e) => { e.stopPropagation(); onToggle(groupName, e.altKey); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-help-id="anim.tracks"
                >
                    <span className="text-gray-500 w-4"><FolderIcon open={!collapsed} /></span>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{groupName}</span>
                </div>
                <div className="flex-1 relative group/track">
                    {groupKeyframes.map(frame => (
                        <div 
                            key={frame}
                            className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-gray-500/50 border border-gray-400/50 rotate-45 cursor-grab hover:bg-white hover:border-white hover:scale-125 z-10"
                            style={{ left: `${frame * frameWidth - 6}px` }}
                            onMouseDown={(e) => onGroupKeyMouseDown(e, trackIds, frame)}
                            data-help-id="anim.keyframes"
                        />
                    ))}
                </div>
            </div>
            
            {!collapsed && trackIds.map(tid => (
                <TrackRow 
                    key={tid} 
                    tid={tid} 
                    sequence={sequence} 
                    frameWidth={frameWidth} 
                    isSelected={selectedTrackIds.includes(tid)}
                    selectedKeys={selectedKeyframeIds}
                    onSelect={onTrackSelect}
                    onRemove={() => onRemoveTrack(tid)}
                    onAddKey={(f) => onAddKey(tid, f)}
                    onKeyMouseDown={onKeyMouseDown}
                />
            ))}
        </>
    );
});
