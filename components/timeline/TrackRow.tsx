
import React, { memo, useRef, useEffect, useCallback } from 'react';
import { AnimationSequence } from '../../types';
import { useAnimationStore } from '../../store/animationStore';
import { useHelpContextMenu } from '../../hooks/useHelpContextMenu';
import { TrashIcon } from '../Icons';
import { getLiveValue } from '../../utils/timelineUtils';

// Global refs to track LiveValueDisplay components across ticks
const liveValueState = {
    displays: new Map<string, HTMLSpanElement>()
};

// Global refs for keyframe diamond dirty-state updates (DOM-direct, no React re-renders)
const diamondState = {
    // Key: "tid::kid", Value: { element, frame, trackId }
    diamonds: new Map<string, { el: HTMLDivElement, frame: number, tid: string }>()
};

// Global refs for group-level diamond dirty-state (collapsed vec groups)
export const groupDiamondState = {
    // Key: "group::frame", Value: { element, frame, trackIds[] }
    diamonds: new Map<string, { el: HTMLDivElement, frame: number, tids: string[] }>()
};

// Direct inline style for dirty state — use !important to override Tailwind CDN
const setDirtyState = (el: HTMLDivElement, isDirty: boolean) => {
    if (isDirty) {
        el.style.setProperty('background-color', '#991b1b', 'important');
        el.style.setProperty('border-color', '#f87171', 'important');
    } else {
        el.style.removeProperty('background-color');
        el.style.removeProperty('border-color');
    }
};

// Export tick function for orchestrated updates
export const tick = () => {
    const animStore = useAnimationStore.getState();
    const { isPlaying, currentFrame, sequence } = animStore;

    liveValueState.displays.forEach((ref, tid) => {
        if (ref) {
            try {
                const val = getLiveValue(tid, isPlaying, currentFrame, sequence);
                ref.innerText = val.toFixed(2);
            } catch (e) {
                console.error('Error updating live value display:', e);
            }
        }
    });

    // Update diamond dirty state (only when not playing to avoid perf hit)
    if (!isPlaying) {
        diamondState.diamonds.forEach((entry) => {
            const { el, frame, tid } = entry;
            const isAtPlayhead = Math.abs(frame - currentFrame) < 0.1;

            if (isAtPlayhead) {
                const track = sequence.tracks[tid];
                if (track) {
                    const kf = track.keyframes.find(k => Math.abs(k.frame - frame) < 0.1);
                    if (kf) {
                        const liveVal = getLiveValue(tid, false, currentFrame, sequence);
                        const isDirty = Math.abs(kf.value - liveVal) > 0.001;
                        setDirtyState(el, isDirty);
                    }
                }
            } else {
                setDirtyState(el, false);
            }
        });

        // Update group-level diamonds (collapsed vec groups)
        groupDiamondState.diamonds.forEach((entry) => {
            const { el, frame, tids } = entry;
            const isAtPlayhead = Math.abs(frame - currentFrame) < 0.1;

            if (isAtPlayhead) {
                let anyDirty = false;
                for (const tid of tids) {
                    const track = sequence.tracks[tid];
                    if (track) {
                        const kf = track.keyframes.find(k => Math.abs(k.frame - frame) < 0.1);
                        if (kf) {
                            const liveVal = getLiveValue(tid, false, currentFrame, sequence);
                            if (Math.abs(kf.value - liveVal) > 0.001) {
                                anyDirty = true;
                                break;
                            }
                        }
                    }
                }
                setDirtyState(el, anyDirty);
            } else {
                setDirtyState(el, false);
            }
        });
    }
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

// Diamond component that registers with the tick system for dirty-state coloring
const KeyframeDiamond = ({ tid, kid, frame, isSelected, interpolation }: {
    tid: string;
    kid: string;
    frame: number;
    isSelected: boolean;
    interpolation: string;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const compositeKey = `${tid}::${kid}`;

    useEffect(() => {
        if (ref.current) {
            diamondState.diamonds.set(compositeKey, { el: ref.current, frame, tid });
        }
        return () => { diamondState.diamonds.delete(compositeKey); };
    }, [compositeKey, frame, tid]);

    const shape = interpolation === 'Linear' ? 'rotate-45 rounded-sm'
        : interpolation === 'Step' ? 'rounded-none'
        : 'rounded-full';

    return (
        <div
            ref={ref}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border transition-transform ${
                isSelected ? 'bg-white border-white scale-125 z-30'
                : 'bg-cyan-900 border-cyan-400 group-hover/key:scale-125 group-hover/key:bg-cyan-400'
            } ${shape}`}
        />
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
}

export const TrackRow: React.FC<TrackRowProps> = memo(({
    tid, sequence, frameWidth, isSelected, selectedKeys, onSelect, onRemove, onAddKey, onKeyMouseDown
}) => {
    const handleContextMenu = useHelpContextMenu();

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
                            style={{ left: `${k.frame * frameWidth - 10}px`, width: '20px', height: '20px' }}
                            onMouseDown={(e) => onKeyMouseDown(e, tid, k.id)}
                            data-help-id="anim.keyframes"
                        >
                            <KeyframeDiamond
                                tid={tid}
                                kid={k.id}
                                frame={k.frame}
                                isSelected={isKeySelected}
                                interpolation={k.interpolation}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
