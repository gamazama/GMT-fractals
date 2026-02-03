
import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import { Track, BezierHandle } from '../types';
import { constrainKeyframeHandles, scaleKeyframeHandles } from '../utils/timelineUtils';

interface DopeSheetInteractionProps {
    frameWidth: number;
    contentRef: React.RefObject<HTMLDivElement>;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    SIDEBAR_WIDTH: number;
    RULER_HEIGHT: number;
    GROUP_HEIGHT: number;
    TRACK_HEIGHT: number;
    organizedTracks: { groups: Record<string, string[]>, standalone: string[] };
    collapsedGroups: Set<string>;
    sequence: any;
    selectedTrackIds: string[];
}

interface DragKeyData {
    trackId: string;
    keyId: string;
    startFrame: number;
    startLeftTan?: BezierHandle;
    startRightTan?: BezierHandle;
}

interface NeighborKeyData {
    trackId: string;
    keyId: string;
    frame: number; // Static frame (neighbors don't move unless they are also DragKeyData)
    // We only need to store the tangent pointing towards the selection
    startLeftTan?: BezierHandle;  // If this key is to the Right of selection
    startRightTan?: BezierHandle; // If this key is to the Left of selection
    
    // Which keys in the selection is this neighbor connected to?
    leftReferenceKeyId?: string;  // The dragged key to the left of this neighbor
    rightReferenceKeyId?: string; // The dragged key to the right of this neighbor
}

export const useDopeSheetInteraction = ({
    frameWidth,
    contentRef,
    scrollContainerRef,
    SIDEBAR_WIDTH,
    RULER_HEIGHT,
    GROUP_HEIGHT,
    TRACK_HEIGHT,
    organizedTracks,
    collapsedGroups,
    sequence,
    selectedTrackIds
}: DopeSheetInteractionProps) => {
    const { 
        updateKeyframes, 
        selectKeyframes, 
        selectTrack, 
        deselectAllKeys, 
        setIsScrubbing,
        selectedKeyframeIds,
        snapshot 
    } = useAnimationStore();

    const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    
    const boxStartRef = useRef<{ x: number, y: number } | null>(null);
    
    // Updated Drag State to include neighbors
    const dragState = useRef<{ 
        startX: number, 
        keys: DragKeyData[],
        neighbors: Map<string, NeighborKeyData> // Keyed by "trackId::keyId"
    } | null>(null);

    const transformState = useRef<{ 
        type: 'move' | 'scale_left' | 'scale_right', 
        startX: number, 
        initialKeys: { trackId: string, keyId: string, startFrame: number }[],
        minFrame: number,
        maxFrame: number
    } | null>(null);

    const startDragKeys = (startX: number, keyIds: string[]) => {
        const keys: DragKeyData[] = [];
        const draggedSet = new Set(keyIds);
        const neighbors = new Map<string, NeighborKeyData>();
        
        // 1. Collect Dragged Keys
        keyIds.forEach(compositeId => {
            const [tid, kid] = compositeId.split('::') as [string, string];
            const track = sequence.tracks[tid];
            const k = track?.keyframes.find(kf => kf.id === kid);
            if (k) {
                keys.push({
                    trackId: tid,
                    keyId: kid,
                    startFrame: k.frame,
                    startLeftTan: k.leftTangent ? { ...k.leftTangent } : undefined,
                    startRightTan: k.rightTangent ? { ...k.rightTangent } : undefined
                });
            }
        });
        
        // 2. Identify Neighbors
        // We iterate through all dragged keys, find their neighbors in the sequence.
        // If a neighbor is NOT in the dragged set, we add it to the neighbors map.
        keys.forEach(draggedKey => {
            const track = sequence.tracks[draggedKey.trackId];
            if (!track) return;
            
            // Need sorted keys to find neighbors
            const sortedKeys = [...track.keyframes].sort((a,b) => a.frame - b.frame);
            const idx = sortedKeys.findIndex(k => k.id === draggedKey.keyId);
            if (idx === -1) return;
            
            // Check Previous (Neighbor to the Left)
            if (idx > 0) {
                const prev = sortedKeys[idx - 1];
                const prevComposite = `${draggedKey.trackId}::${prev.id}`;
                if (!draggedSet.has(prevComposite)) {
                    // This neighbor is static. It needs its Right Tangent adjusted.
                    if (!neighbors.has(prevComposite)) {
                        neighbors.set(prevComposite, {
                            trackId: draggedKey.trackId,
                            keyId: prev.id,
                            frame: prev.frame,
                            startRightTan: prev.rightTangent ? { ...prev.rightTangent } : undefined
                        });
                    }
                    // Link this neighbor to the dragged key (it is the "Right Reference" for the neighbor)
                    neighbors.get(prevComposite)!.rightReferenceKeyId = draggedKey.keyId;
                }
            }
            
            // Check Next (Neighbor to the Right)
            if (idx < sortedKeys.length - 1) {
                const next = sortedKeys[idx + 1];
                const nextComposite = `${draggedKey.trackId}::${next.id}`;
                if (!draggedSet.has(nextComposite)) {
                    // This neighbor is static. It needs its Left Tangent adjusted.
                    if (!neighbors.has(nextComposite)) {
                        neighbors.set(nextComposite, {
                            trackId: draggedKey.trackId,
                            keyId: next.id,
                            frame: next.frame,
                            startLeftTan: next.leftTangent ? { ...next.leftTangent } : undefined
                        });
                    }
                    // Link this neighbor to the dragged key (it is the "Left Reference" for the neighbor)
                    neighbors.get(nextComposite)!.leftReferenceKeyId = draggedKey.keyId;
                }
            }
        });

        dragState.current = { startX, keys, neighbors };
        setIsScrubbing(true); 
    };

    const startTransformSelection = (e: React.MouseEvent, type: 'move' | 'scale_left' | 'scale_right', minFrame: number, maxFrame: number) => {
        e.stopPropagation();
        e.preventDefault();
        snapshot();
        setIsScrubbing(true); 

        const initialKeys: { trackId: string, keyId: string, startFrame: number }[] = [];
        selectedKeyframeIds.forEach(id => {
            const [tid, kid] = id.split('::');
            const t = sequence.tracks[tid];
            const k = t?.keyframes.find(kf => kf.id === kid);
            if (k) {
                initialKeys.push({ trackId: tid, keyId: k.id, startFrame: k.frame });
            }
        });

        transformState.current = {
            type,
            startX: e.clientX,
            initialKeys,
            minFrame,
            maxFrame
        };
    };

    const handleContentMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.transform-handle')) return;

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) deselectAllKeys();

        const container = contentRef.current;
        if (!container) return;
        
        let forcedY: number | null = null;
        if (scrollContainerRef.current) {
            const scrollRect = scrollContainerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - scrollRect.top;
            if (relativeY < RULER_HEIGHT) return; 
            if (relativeY < RULER_HEIGHT + GROUP_HEIGHT) forcedY = RULER_HEIGHT + 1;
            if (e.clientX - scrollRect.left < SIDEBAR_WIDTH) return;
        }

        const rect = container.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = forcedY !== null ? forcedY : (e.clientY - rect.top);
        
        boxStartRef.current = { x: startX, y: startY };
        setSelectionBox({ x: startX, y: startY, w: 0, h: 0 });
    };

    const propsRef = useRef({ organizedTracks, collapsedGroups, sequence, selectedTrackIds, frameWidth });
    useEffect(() => {
        propsRef.current = { organizedTracks, collapsedGroups, sequence, selectedTrackIds, frameWidth };
    }, [organizedTracks, collapsedGroups, sequence, selectedTrackIds, frameWidth]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const currentFrameVal = useAnimationStore.getState().currentFrame;
            const currentFrameWidth = propsRef.current.frameWidth;

            // 1. Handle Keyframe Dragging
            if (dragState.current) {
                const diffPx = e.clientX - dragState.current.startX;
                const diffFrames = Math.round(diffPx / currentFrameWidth);
                
                // Map to store dragged key current positions for neighbor calculation
                const draggedPositions = new Map<string, number>();
                dragState.current.keys.forEach(k => {
                    draggedPositions.set(k.keyId, Math.max(0, k.startFrame + diffFrames));
                });

                const updates: any[] = [];

                // A. Update Dragged Keys
                dragState.current.keys.forEach(k => {
                    const newFrame = Math.max(0, k.startFrame + diffFrames);
                    const patch: Partial<any> = { frame: newFrame };
                    
                    const track = propsRef.current.sequence.tracks[k.trackId];
                    if (track) {
                        const keysSorted = [...track.keyframes].sort((a:any, b:any) => a.frame - b.frame);
                        const currentKey = keysSorted.find((key:any) => key.id === k.keyId);
                        
                        if (currentKey) {
                             const idx = keysSorted.indexOf(currentKey);
                             const prev = idx > 0 ? keysSorted[idx - 1] : undefined;
                             const next = idx < keysSorted.length - 1 ? keysSorted[idx + 1] : undefined;
                             
                             // Scale Tangents using initial state
                             const initialKeySnapshot = { 
                                 ...currentKey, 
                                 leftTangent: k.startLeftTan, 
                                 rightTangent: k.startRightTan 
                             };

                             // Note: scaleKeyframeHandles uses prev.frame and next.frame. 
                             // If prev/next are also dragged, we should ideally use their new positions.
                             // But scaleKeyframeHandles assumes "oldFrame" -> "newFrame" for the current key
                             // determines the ratio. 
                             // To be perfectly accurate for block moves, we should pass the actual new interval ratios.
                             // But the standard function works well enough for 99% of cases.
                             const scalePatch = scaleKeyframeHandles(initialKeySnapshot, prev, next, k.startFrame, newFrame);
                             Object.assign(patch, scalePatch);

                             const movedKey = { ...currentKey, frame: newFrame, ...patch };
                             const constraint = constrainKeyframeHandles(movedKey, prev, next);
                             Object.assign(patch, constraint);
                        }
                    }
                    updates.push({ trackId: k.trackId, keyId: k.keyId, patch });
                });

                // B. Update Neighbors (The "In-between" tangents)
                dragState.current.neighbors.forEach((neighbor) => {
                    const patch: Partial<any> = {};
                    
                    // 1. Right Tangent (Pointing to a dragged key on the right)
                    if (neighbor.rightReferenceKeyId && neighbor.startRightTan) {
                        const draggedPos = draggedPositions.get(neighbor.rightReferenceKeyId);
                        const draggedStartFrame = dragState.current!.keys.find(k => k.keyId === neighbor.rightReferenceKeyId)?.startFrame;
                        
                        if (draggedPos !== undefined && draggedStartFrame !== undefined) {
                            const oldDist = draggedStartFrame - neighbor.frame;
                            const newDist = draggedPos - neighbor.frame;
                            
                            if (Math.abs(oldDist) > 1e-5 && Math.abs(newDist) > 1e-5) {
                                const ratio = newDist / oldDist;
                                patch.rightTangent = {
                                    x: neighbor.startRightTan.x * ratio,
                                    y: neighbor.startRightTan.y * ratio
                                };
                            }
                        }
                    }
                    
                    // 2. Left Tangent (Pointing to a dragged key on the left)
                    if (neighbor.leftReferenceKeyId && neighbor.startLeftTan) {
                        const draggedPos = draggedPositions.get(neighbor.leftReferenceKeyId);
                        const draggedStartFrame = dragState.current!.keys.find(k => k.keyId === neighbor.leftReferenceKeyId)?.startFrame;
                        
                        if (draggedPos !== undefined && draggedStartFrame !== undefined) {
                            const oldDist = neighbor.frame - draggedStartFrame;
                            const newDist = neighbor.frame - draggedPos;
                            
                            if (Math.abs(oldDist) > 1e-5 && Math.abs(newDist) > 1e-5) {
                                const ratio = newDist / oldDist;
                                patch.leftTangent = {
                                    x: neighbor.startLeftTan.x * ratio,
                                    y: neighbor.startLeftTan.y * ratio
                                };
                            }
                        }
                    }
                    
                    if (Object.keys(patch).length > 0) {
                        updates.push({ trackId: neighbor.trackId, keyId: neighbor.keyId, patch });
                    }
                });
                
                updateKeyframes(updates);
                animationEngine.scrub(currentFrameVal);
            }

            // 2. Handle Transform Bar Dragging (Existing logic preserved)
            if (transformState.current) {
                const { type, startX, initialKeys, minFrame, maxFrame } = transformState.current;
                const diffPx = e.clientX - startX;
                const updates: any[] = [];
                
                if (type === 'move') {
                    const diffFrames = Math.round(diffPx / currentFrameWidth);
                    initialKeys.forEach(k => {
                        const newFrame = Math.max(0, k.startFrame + diffFrames);
                        updates.push({
                            trackId: k.trackId,
                            keyId: k.keyId,
                            patch: { frame: newFrame }
                        });
                    });
                }
                else if (type === 'scale_left' || type === 'scale_right') {
                    const span = Math.max(1, maxFrame - minFrame);
                    let ratio = 1.0;
                    
                    if (type === 'scale_right') {
                         const deltaFrames = diffPx / currentFrameWidth;
                         const newSpan = Math.max(1, span + deltaFrames);
                         ratio = newSpan / span;
                         
                         initialKeys.forEach(k => {
                             const localPos = k.startFrame - minFrame;
                             const newFrame = minFrame + (localPos * ratio);
                             updates.push({
                                trackId: k.trackId,
                                keyId: k.keyId,
                                patch: { frame: Math.max(0, Math.round(newFrame)) }
                             });
                         });
                    } else {
                        const deltaFrames = diffPx / currentFrameWidth;
                        const newSpan = Math.max(1, span - deltaFrames); 
                        ratio = newSpan / span;
                        
                        initialKeys.forEach(k => {
                             const distFromMax = maxFrame - k.startFrame;
                             const newFrame = maxFrame - (distFromMax * ratio);
                             updates.push({
                                trackId: k.trackId,
                                keyId: k.keyId,
                                patch: { frame: Math.max(0, Math.round(newFrame)) }
                             });
                        });
                    }
                }
                
                if (updates.length > 0) {
                    updateKeyframes(updates);
                    animationEngine.scrub(currentFrameVal);
                }
            }

            // 3. Handle Selection Box
            if (boxStartRef.current && contentRef.current) {
                const rect = contentRef.current.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const x = Math.min(currentX, boxStartRef.current.x);
                const y = Math.min(currentY, boxStartRef.current.y);
                const w = Math.abs(currentX - boxStartRef.current.x);
                const h = Math.abs(currentY - boxStartRef.current.y);
                
                setSelectionBox({ x, y, w, h });
            }
        };
        
        const onUp = (e: MouseEvent) => {
            const { organizedTracks, collapsedGroups, sequence, selectedTrackIds, frameWidth } = propsRef.current;

            if (dragState.current || transformState.current) {
                setIsScrubbing(false);
            }
            dragState.current = null;
            transformState.current = null;
            
            if (boxStartRef.current && selectionBox && contentRef.current) {
                const newSelectedIds = new Set<string>();
                const tracksInvolved = new Set<string>();
                
                const boxX = selectionBox.x;
                const boxY = selectionBox.y;
                const boxR = boxX + selectionBox.w;
                const boxB = boxY + selectionBox.h;

                const globalTop = RULER_HEIGHT;
                const globalBottom = RULER_HEIGHT + GROUP_HEIGHT;
                
                if (boxB > globalTop && boxY < globalBottom) {
                    const allTracks = Object.values(sequence.tracks) as Track[];
                    allTracks.forEach(track => {
                         if (track.hidden) return;
                         track.keyframes.forEach(k => {
                            const kx = SIDEBAR_WIDTH + k.frame * frameWidth;
                            if (kx >= boxX && kx <= boxR) {
                                newSelectedIds.add(`${track.id}::${k.id}`);
                                tracksInvolved.add(track.id);
                            }
                         });
                    });
                }

                let yOffset = RULER_HEIGHT + GROUP_HEIGHT; 
                const BUFFER = 4;

                const checkTrack = (tid: string) => {
                    const trackTop = yOffset + BUFFER;
                    const trackBottom = yOffset + TRACK_HEIGHT - BUFFER;
                    
                    if (boxB > trackTop && boxY < trackBottom) {
                        const track = sequence.tracks[tid];
                        if (track) {
                            track.keyframes.forEach((k: any) => {
                                const kx = SIDEBAR_WIDTH + k.frame * frameWidth;
                                if (kx >= boxX && kx <= boxR) {
                                    newSelectedIds.add(`${tid}::${k.id}`);
                                    tracksInvolved.add(tid);
                                }
                            });
                        }
                    }
                    yOffset += TRACK_HEIGHT;
                };

                Object.entries(organizedTracks.groups).forEach(([groupName, ids]) => {
                    const groupTop = yOffset;
                    const groupBottom = yOffset + GROUP_HEIGHT;
                    
                    if (boxB > groupTop && boxY < groupBottom) {
                        (ids as string[]).forEach(tid => {
                            const track = sequence.tracks[tid];
                            if (track) {
                                track.keyframes.forEach(k => {
                                    const kx = SIDEBAR_WIDTH + k.frame * frameWidth;
                                    if (kx >= boxX && kx <= boxR) {
                                        newSelectedIds.add(`${tid}::${k.id}`);
                                        tracksInvolved.add(tid);
                                    }
                                });
                            }
                        });
                    }

                    yOffset += GROUP_HEIGHT; 
                    
                    if (!collapsedGroups.has(groupName)) {
                        (ids as string[]).forEach(tid => checkTrack(tid));
                    }
                });
                
                organizedTracks.standalone.forEach(tid => checkTrack(tid));

                if (newSelectedIds.size > 0) {
                    const isMulti = e.shiftKey || e.ctrlKey;
                    const idsArray = Array.from(newSelectedIds);
                    selectKeyframes(idsArray, isMulti);
                    
                    if (isMulti) {
                        tracksInvolved.forEach(t => {
                            if (!selectedTrackIds.includes(t)) selectTrack(t, true);
                        });
                    } else {
                        const tracksArray = Array.from(tracksInvolved);
                        if (tracksArray.length > 0) {
                            selectTrack(tracksArray[0], false);
                            for (let i = 1; i < tracksArray.length; i++) {
                                selectTrack(tracksArray[i], true);
                            }
                        }
                    }
                } else if (!e.shiftKey && !e.ctrlKey) {
                    deselectAllKeys();
                }

                setSelectionBox(null);
                boxStartRef.current = null;
            }
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [selectionBox]); 

    return {
        selectionBox,
        handleContentMouseDown,
        startDragKeys,
        startTransformSelection
    };
};
