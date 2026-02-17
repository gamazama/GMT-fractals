
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { TimelineRuler } from './TimelineRuler';
import { Track } from '../../types';
import { TrackRow } from './TrackRow';
import { TrackGroup } from './TrackGroup';
import { useDopeSheetInteraction } from '../../hooks/useDopeSheetInteraction';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { TIMELINE_SIDEBAR_WIDTH, TIMELINE_RULER_HEIGHT, TIMELINE_GROUP_HEIGHT, TIMELINE_TRACK_HEIGHT } from '../../data/constants';

interface DopeSheetProps {
    frameWidth: number;
    totalContentWidth: number;
    onContextMenu: (e: React.MouseEvent, tid: string, kid: string, interp: string, broken: boolean, auto: boolean) => void;
    onCanvasContextMenu: (e: React.MouseEvent, frame: number) => void; // New Prop
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    scrollLeft: number;
    visibleWidth: number;
}

const PlayheadCursor = ({ frameWidth }: { frameWidth: number }) => {
    const currentFrame = useAnimationStore(s => s.currentFrame);
    return (
        <div 
            className="absolute top-6 bottom-0 w-px bg-red-500/50 pointer-events-none z-10"
            style={{ left: `${TIMELINE_SIDEBAR_WIDTH + (currentFrame * frameWidth)}px` }} 
        />
    );
};

export const DopeSheet: React.FC<DopeSheetProps> = ({ 
    frameWidth, totalContentWidth, onContextMenu, onCanvasContextMenu, scrollContainerRef, scrollLeft, visibleWidth 
}) => {
    const sequence = useAnimationStore(s => s.sequence);
    const selectedTrackIds = useAnimationStore(s => s.selectedTrackIds);
    const selectedKeyframeIds = useAnimationStore(s => s.selectedKeyframeIds);
    const durationFrames = useAnimationStore(s => s.durationFrames);
    
    const { 
        selectTrack, selectKeyframe, selectKeyframes,
        removeTrack, addKeyframe, snapshot, deleteSelectedKeyframes
    } = useAnimationStore();

    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Formula', 'Optics', 'Lighting', 'Shading']));
    const contentRef = useRef<HTMLDivElement>(null);
    const lastSelectedTrackId = useRef<string | null>(null);

    // Enforce scroll position sync immediately on mount/render to fix alignment issues
    useLayoutEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft;
        }
    }, [scrollLeft, scrollContainerRef]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelectedKeyframes();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedKeyframes]);
    
    useEffect(() => {
        const handleFocus = (trackId: string) => {
            if (!trackId) return;
            const tid = String(trackId);
            let targetGroup = 'Shading';
            
            if (tid.startsWith('camera.')) {
                targetGroup = 'Camera';
            } else if (tid.startsWith('lights.') || tid.startsWith('lighting.')) {
                targetGroup = 'Lighting';
            } else if (tid.startsWith('coreMath.') || tid.startsWith('geometry.') || tid.startsWith('julia.') || tid.startsWith('hybridParams.') || tid === 'iterations' || tid.startsWith('param')) {
                targetGroup = 'Formula';
            } else if (tid === 'camFov' || tid.startsWith('optics.') || tid.startsWith('dof') || tid.startsWith('fog')) {
                targetGroup = 'Optics';
            }

            setCollapsedGroups(prev => {
                const allGroups = new Set<string>(['Camera', 'Formula', 'Optics', 'Lighting', 'Shading']);
                allGroups.delete(targetGroup);
                return allGroups;
            });
        };
        
        const unsub = FractalEvents.on(FRACTAL_EVENTS.TRACK_FOCUS, handleFocus);
        return unsub;
    }, []);

    const toggleGroup = (groupName: string, isAlt: boolean) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (isAlt) {
                next.clear();
                Object.keys(organizedTracks.groups).forEach(g => {
                    if (g !== groupName) next.add(g);
                });
                next.delete(groupName);
            } else {
                if (next.has(groupName)) next.delete(groupName);
                else next.add(groupName);
            }
            return next;
        });
    };

    const organizedTracks = useMemo<{ groups: Record<string, string[]>, standalone: string[] }>(() => {
        const groups: Record<string, string[]> = {};
        const standalone: string[] = [];
        
        groups['Camera'] = [];
        groups['Formula'] = [];
        groups['Optics'] = [];
        groups['Lighting'] = [];
        groups['Shading'] = [];

        (Object.values(sequence.tracks) as Track[]).forEach(t => {
            if (t.hidden) return;
            
            if (t.id.startsWith('camera.')) {
                groups['Camera'].push(t.id);
            } else if (t.id.startsWith('lights.') || t.id.startsWith('lighting.')) {
                groups['Lighting'].push(t.id);
            } else if (t.id.startsWith('coreMath.') || t.id.startsWith('geometry.') || t.id.startsWith('param') || t.id.startsWith('julia.') || t.id.startsWith('hybridParams.') || t.id === 'iterations') {
                groups['Formula'].push(t.id);
            } else if (t.id === 'camFov' || t.id.startsWith('optics.') || t.id.startsWith('dof') || t.id.startsWith('fog') || t.id.startsWith('atmosphere.')) {
                if (t.id.startsWith('fog') || t.id.startsWith('atmosphere.')) groups['Shading'].push(t.id);
                else groups['Optics'].push(t.id);
            } else {
                groups['Shading'].push(t.id);
            }
        });
        
        Object.keys(groups).forEach(k => {
            if (groups[k].length === 0) delete groups[k];
        });

        return { groups, standalone };
    }, [sequence.tracks]);

    const visibleTrackOrder = useMemo(() => {
        let order: string[] = [];
        Object.entries(organizedTracks.groups).forEach(([name, ids]) => {
            if (!collapsedGroups.has(name)) {
                order = order.concat(ids as string[]);
            }
        });
        order = order.concat(organizedTracks.standalone);
        return order;
    }, [organizedTracks, collapsedGroups]);

    const selectionRange = useMemo(() => {
        if (selectedKeyframeIds.length < 2) return null;
        
        let minF = Infinity;
        let maxF = -Infinity;
        let found = false;

        selectedKeyframeIds.forEach(id => {
             const [tid, kid] = id.split('::');
             const track = sequence.tracks[tid];
             if (track) {
                 const key = track.keyframes.find(k => k.id === kid);
                 if (key) {
                     if (key.frame < minF) minF = key.frame;
                     if (key.frame > maxF) maxF = key.frame;
                     found = true;
                 }
             }
        });

        if (!found || minF === Infinity) return null;
        if (Math.abs(maxF - minF) < 0.001) return null;
        
        return { min: minF, max: maxF };
    }, [selectedKeyframeIds, sequence]);

    const { selectionBox, handleContentMouseDown, startDragKeys, startTransformSelection } = useDopeSheetInteraction({
        frameWidth,
        contentRef,
        scrollContainerRef,
        SIDEBAR_WIDTH: TIMELINE_SIDEBAR_WIDTH,
        RULER_HEIGHT: TIMELINE_RULER_HEIGHT,
        GROUP_HEIGHT: TIMELINE_GROUP_HEIGHT,
        TRACK_HEIGHT: TIMELINE_TRACK_HEIGHT,
        organizedTracks,
        collapsedGroups,
        sequence,
        selectedTrackIds
    });

    const getGroupKeyframes = (trackIds: string[]) => {
        const frameSet = new Set<number>();
        trackIds.forEach(tid => {
            const t = sequence.tracks[tid];
            if(t) t.keyframes.forEach(k => frameSet.add(k.frame));
        });
        return Array.from(frameSet).sort((a,b) => a-b);
    };
    
    const getRootKeyframes = () => {
        const visibleTrackIds = (Object.values(sequence.tracks) as Track[])
            .filter(t => !t.hidden)
            .map(t => t.id);
        return getGroupKeyframes(visibleTrackIds);
    };

    const handleTrackSelect = (e: React.MouseEvent, tid: string) => {
        const multi = e.ctrlKey || e.metaKey || e.shiftKey;
        
        if (e.shiftKey && lastSelectedTrackId.current) {
            const startIdx = visibleTrackOrder.indexOf(lastSelectedTrackId.current);
            const endIdx = visibleTrackOrder.indexOf(tid);
            
            if (startIdx !== -1 && endIdx !== -1) {
                const minIdx = Math.min(startIdx, endIdx);
                const maxIdx = Math.max(startIdx, endIdx);
                const rangeTracks = visibleTrackOrder.slice(minIdx, maxIdx + 1);
                
                rangeTracks.forEach(t => selectTrack(t, true)); 
                
                const keysToSelect: string[] = [];
                rangeTracks.forEach(t => {
                    const track = sequence.tracks[t];
                    if (track) {
                        track.keyframes.forEach(k => keysToSelect.push(`${t}::${k.id}`));
                    }
                });
                selectKeyframes(keysToSelect, true);
            }
        } else {
            selectTrack(tid, multi);
            
            const track = sequence.tracks[tid];
            if (track) {
                const keys = track.keyframes.map(k => `${tid}::${k.id}`);
                selectKeyframes(keys, multi); 
            }
        }
        
        lastSelectedTrackId.current = tid;
    };

    const handleKeyMouseDown = (e: React.MouseEvent, tid: string, kid: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (e.button === 2) {
            const composite = `${tid}::${kid}`;
            if (!selectedKeyframeIds.includes(composite)) {
                selectKeyframe(tid, kid, false);
                selectTrack(tid, false);
            }
            const track = sequence.tracks[tid];
            const k = track?.keyframes.find(kf => kf.id === kid);
            if (k) {
                onContextMenu(e, tid, kid, k.interpolation, !!k.brokenTangents, !!k.autoTangent);
            }
            return;
        }

        const composite = `${tid}::${kid}`;
        const isSelected = selectedKeyframeIds.includes(composite);
        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

        if (isMulti) {
            selectKeyframe(tid, kid, true);
            if (!selectedTrackIds.includes(tid)) selectTrack(tid, true);
            snapshot();
            const keysToDrag = isSelected 
                ? selectedKeyframeIds 
                : [...selectedKeyframeIds, composite];
            startDragKeys(e.clientX, keysToDrag);
        }
        else if (!isSelected) {
            selectKeyframe(tid, kid, false);
            selectTrack(tid, false);
            snapshot();
            startDragKeys(e.clientX, [composite]);
        } else {
             snapshot();
             startDragKeys(e.clientX, selectedKeyframeIds);
        }
    };

    const handleGroupKeyMouseDown = (e: React.MouseEvent, groupTrackIds: string[], frame: number) => {
        e.stopPropagation();
        e.preventDefault();
        
        const keysInGroup: string[] = [];
        
        groupTrackIds.forEach(tid => {
            const t = sequence.tracks[tid];
            const k = t?.keyframes.find(key => Math.abs(key.frame - frame) < 0.001);
            if (k) {
                keysInGroup.push(`${tid}::${k.id}`);
            }
        });

        if (keysInGroup.length === 0) return;

        if (e.button === 2) {
            selectKeyframes(keysInGroup, false);
            const [firstTid, firstKid] = keysInGroup[0].split('::');
            const t = sequence.tracks[firstTid];
            const k = t?.keyframes.find(key => key.id === firstKid);
            if (k) {
                onContextMenu(e, firstTid, firstKid, k.interpolation, !!k.brokenTangents, !!k.autoTangent);
            }
            return;
        }

        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        snapshot();
        
        if (isMulti) {
            selectKeyframes(keysInGroup, true);
            groupTrackIds.forEach(tid => {
                if(!selectedTrackIds.includes(tid)) selectTrack(tid, true);
            });
            // Merge existing and new
            const allKeys = Array.from(new Set([...selectedKeyframeIds, ...keysInGroup]));
            startDragKeys(e.clientX, allKeys);
        } else {
            selectKeyframes(keysInGroup, false);
            groupTrackIds.forEach((tid, idx) => {
                if (idx === 0) selectTrack(tid, false);
                else selectTrack(tid, true);
            });
            startDragKeys(e.clientX, keysInGroup);
        }
    };

    const wrapAddKey = (tid: string, frame: number) => {
        snapshot(); 
        import('../../utils/timelineUtils').then(mod => {
            const val = mod.getLiveValue(tid, false, frame, sequence);
            addKeyframe(tid, frame, val);
        });
    };
    
    const handleBackgroundContextMenu = (e: React.MouseEvent) => {
         // Stop immediate bubbling to parents, but allow internal logic
         e.preventDefault();
         
         const container = contentRef.current;
         if (!container) return;
         
         const rect = container.getBoundingClientRect();
         // Calculate X relative to the content area (scrolled)
         // Note: scrollLeft prop is passed down but we need current scroll state or calc
         // Better to use absolute clientX mapped to frame
         // Sidebar is fixed position visually, but content scrolls
         // Frame 0 starts at SIDEBAR_WIDTH
         
         const xRelativeToContainer = e.clientX - rect.left;
         // Since container moves with scroll, we need to add scroll offset
         // But the container is inside scrollContainerRef which has scrollLeft
         // Wait, DopeSheet content div has relative position.
         // Let's use the scrollContainerRef to get the scroll offset.
         
         const scrollOffset = scrollContainerRef.current?.scrollLeft || 0;
         const totalX = xRelativeToContainer + scrollOffset;
         
         // Remove Sidebar width
         const frameAreaX = totalX - TIMELINE_SIDEBAR_WIDTH;
         const frame = Math.max(0, Math.round(frameAreaX / frameWidth));
         
         onCanvasContextMenu(e, frame);
    };

    const limitX = TIMELINE_SIDEBAR_WIDTH + durationFrames * frameWidth;
    const limitWidth = Math.max(0, (scrollLeft + visibleWidth) - limitX + 500); 
    
    return (
        <div 
            ref={contentRef}
            className="relative min-h-full bg-[#111]" 
            style={{ minWidth: totalContentWidth }}
            onMouseDown={handleContentMouseDown}
            data-help-id="ui.timeline"
            onContextMenu={handleBackgroundContextMenu}
        >
            <div 
                className="absolute top-0 bottom-0 pointer-events-none z-0"
                style={{ 
                    left: limitX, 
                    width: limitWidth,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 10px, transparent 10px, transparent 20px)',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                }}
            />

            <TimelineRuler 
                FRAME_WIDTH={frameWidth} 
                durationFrames={durationFrames} 
                scrollLeft={scrollLeft}
                visibleWidth={visibleWidth}
            />
            
            <PlayheadCursor frameWidth={frameWidth} />

            {selectionBox && (
                <div 
                    className="absolute bg-cyan-500/20 border border-cyan-400/50 z-50 pointer-events-none"
                    style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}
                />
            )}

            {/* ROOT SUMMARY ROW */}
            <div 
                className="flex border-b border-white/5 bg-white/5 sticky top-6 z-20"
                style={{ height: TIMELINE_GROUP_HEIGHT }}
            >
                <div 
                    className="sticky left-0 z-20 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center px-2 select-none" 
                >
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest pl-4">Global Summary</span>
                </div>
                <div className="flex-1 relative group/track">
                    {getRootKeyframes().map(frame => (
                        <div 
                            key={frame}
                            className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-cyan-600 border border-cyan-300 rotate-45 cursor-grab hover:bg-white hover:border-white hover:scale-125 z-10 shadow-sm"
                            style={{ left: `${frame * frameWidth - 6}px` }}
                            onMouseDown={(e) => handleGroupKeyMouseDown(e, Object.keys(sequence.tracks), frame)}
                            data-help-id="anim.keyframes"
                        />
                    ))}

                    {/* SELECTION TRANSFORM BAR */}
                    {selectionRange && (
                        <div 
                            className="absolute top-0 bottom-0 z-30 transform-handle group/transform"
                            style={{ 
                                left: `${selectionRange.min * frameWidth - 12}px`, 
                                width: `${(selectionRange.max - selectionRange.min) * frameWidth + 24}px` 
                            }}
                        >
                            <div 
                                className="absolute top-1 bottom-1 left-0 right-0 bg-orange-500/20 border border-orange-500/50 rounded-md cursor-grab active:cursor-grabbing hover:bg-orange-500/30 transition-colors"
                                onMouseDown={(e) => startTransformSelection(e, 'move', selectionRange.min, selectionRange.max)}
                            />
                            
                            <div 
                                className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize flex items-center justify-center group/l"
                                onMouseDown={(e) => startTransformSelection(e, 'scale_left', selectionRange.min, selectionRange.max)}
                            >
                                <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/l:bg-white" />
                            </div>
                            
                            <div 
                                className="absolute top-0 bottom-0 right-0 w-3 cursor-ew-resize flex items-center justify-center group/r"
                                onMouseDown={(e) => startTransformSelection(e, 'scale_right', selectionRange.min, selectionRange.max)}
                            >
                                <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/r:bg-white" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {Object.entries(organizedTracks.groups).map(([groupName, ids]) => (
                <TrackGroup 
                    key={groupName}
                    groupName={groupName}
                    trackIds={ids}
                    collapsed={collapsedGroups.has(groupName)}
                    onToggle={(name, isAlt) => toggleGroup(name, isAlt)}
                    sequence={sequence}
                    frameWidth={frameWidth}
                    selectedTrackIds={selectedTrackIds}
                    selectedKeyframeIds={selectedKeyframeIds}
                    onTrackSelect={handleTrackSelect}
                    onRemoveTrack={removeTrack}
                    onAddKey={wrapAddKey}
                    onKeyMouseDown={handleKeyMouseDown}
                    onGroupKeyMouseDown={handleGroupKeyMouseDown}
                />
            ))}
            
            {organizedTracks.standalone.map(tid => (
                <TrackRow 
                    key={tid} tid={tid} sequence={sequence} 
                    frameWidth={frameWidth} 
                    isSelected={selectedTrackIds.includes(tid)}
                    selectedKeys={selectedKeyframeIds}
                    onSelect={handleTrackSelect}
                    onRemove={() => removeTrack(tid)}
                    onAddKey={(f) => wrapAddKey(tid, f)}
                    onKeyMouseDown={handleKeyMouseDown}
                />
            ))}
            
            <div className="h-32" />
        </div>
    );
};
