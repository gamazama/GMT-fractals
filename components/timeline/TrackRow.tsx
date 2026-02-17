
import React, { memo, useRef, useEffect } from 'react';
import { AnimationSequence } from '../../types';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { TrashIcon } from '../Icons';
import { getLiveValue } from '../../utils/timelineUtils';

// Global refs to track LiveValueDisplay components across ticks
const liveValueState = {
    displays: new Map<string, HTMLSpanElement>()
};

// Export tick function for orchestrated updates
export const tick = () => {
    const animStore = useAnimationStore.getState();
    
    liveValueState.displays.forEach((ref, tid) => {
        if (ref) {
            try {
                const val = getLiveValue(tid, animStore.isPlaying, animStore.currentFrame, animStore.sequence);
                ref.innerText = val.toFixed(2);
            } catch (e) {
                console.error('Error updating live value display:', e);
            }
        }
    });
};

// Isolated component for the numeric readout
const LiveValueDisplay = ({ tid }: { tid: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    
    // Sync ref with global liveValueState
    useEffect(() => {
        if (ref.current) {
            liveValueState.displays.set(tid, ref.current);
        }
        
        return () => {
            liveValueState.displays.delete(tid);
        };
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
    frameWidth: number;
    isSelected: boolean;
    selectedKeys: string[];
    onSelect: (e: React.MouseEvent, tid: string) => void;
    onRemove: () => void;
    onAddKey: (f: number) => void;
    onKeyMouseDown: (e: React.MouseEvent, tid: string, kid: string) => void;
    // liveValue removed from props
}

export const TrackRow: React.FC<TrackRowProps> = memo(({ 
    tid, sequence, frameWidth, isSelected, selectedKeys, onSelect, onRemove, onAddKey, onKeyMouseDown 
}) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <div 
            className="flex border-b border-white/5 bg-transparent hover:bg-white/5" 
            style={{ height: 32 }}
            data-help-id="anim.tracks"
        >
            <div 
                className={`sticky left-0 z-30 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${isSelected ? 'border-l-2 border-l-cyan-500' : ''}`}
                onClick={(e) => onSelect(e, tid)}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={handleContextMenu}
                data-help-id="anim.tracks"
            >
                <div className="truncate text-[10px] font-bold text-gray-400 group-hover:text-cyan-400 pl-4" title={sequence.tracks[tid].label}>
                    {sequence.tracks[tid].label}
                </div>
                <div className="flex items-center gap-2">
                    <LiveValueDisplay tid={tid} />
                    <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"><TrashIcon /></button>
                </div>
            </div>
            <div 
                className="flex-1 relative group/track z-10"
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    const f = Math.max(0, Math.round((e.clientX - r.left) / frameWidth));
                    onAddKey(f);
                }}
            >
                <div className="absolute inset-0 opacity-0 group-hover/track:opacity-5 bg-white pointer-events-none" />
                {sequence.tracks[tid].keyframes.map((k: any) => {
                    const isKeySelected = selectedKeys.includes(`${tid}::${k.id}`);
                    return (
                        <div
                            key={k.id}
                            className={`absolute top-1/2 -translate-y-1/2 z-20 cursor-grab group/key`}
                            style={{ left: `${k.frame * frameWidth - 10}px`, width: '20px', height: '20px' }} // Big hit area
                            onMouseDown={(e) => onKeyMouseDown(e, tid, k.id)}
                            data-help-id="anim.keyframes"
                        >
                            <div 
                                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border transition-transform ${
                                    isKeySelected ? 'bg-white border-white scale-125 z-30' : 'bg-cyan-900 border-cyan-400 group-hover/key:scale-125 group-hover/key:bg-cyan-400'
                                } ${k.interpolation === 'Linear' ? 'rotate-45 rounded-sm' : k.interpolation === 'Step' ? 'rounded-none' : 'rounded-full'}`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
