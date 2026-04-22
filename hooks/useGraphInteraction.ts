
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import { GraphViewTransform, frameToPixel, valueToPixel, pixelToFrame } from '../utils/GraphUtils';
import { constrainKeyframeHandles, calculateSoftFalloff, scaleKeyframeHandles } from '../utils/timelineUtils';
import { Keyframe, BezierHandle } from '../types';

interface KeyDragStart {
    trackId: string;
    keyId: string;
    startFrame: number;
    startVal: number;
    // Store initial tangents
    startLeftTan?: BezierHandle;
    startRightTan?: BezierHandle;
}

interface NeighborKeyData {
    trackId: string;
    keyId: string;
    frame: number; 
    startLeftTan?: BezierHandle;  
    startRightTan?: BezierHandle; 
    leftReferenceKeyId?: string;  
    rightReferenceKeyId?: string; 
}

// Maps TrackID::KeyID -> Original Frame/Value at drag start
type KeyStateMap = Record<string, { f: number, v: number }>;

type DragMode = 'pan' | 'zoom' | 'scrub' | 'scrub_passive' | 'key' | 'handle' | 'box' | 'soft_radius';

const HIT_TOLERANCE = 8;
const RULER_HEIGHT = 24;

export const useGraphInteraction = (
    canvasRef: React.RefObject<HTMLElement>, // Changed from HTMLCanvasElement to HTMLElement
    view: GraphViewTransform,
    trackIds: string[],
    normalized: boolean,
    trackRanges: Record<string, { min: number, max: number, span: number }>,
    v2p: (val: number, tid: string) => number, // value to pixel helper
    onSetScroll: (px: number) => void,
    onSetFrameWidth: (px: number) => void,
    setViewY: React.Dispatch<React.SetStateAction<{ pan: number; scale: number; }>>,
    // New coordinate mappers
    frameToCanvasPixel: (f: number) => number,
    canvasPixelToFrame: (px: number) => number,
    LEFT_GUTTER_WIDTH: number
) => {
    const { 
        sequence, currentFrame, 
        updateKeyframe, updateKeyframes, 
        selectKeyframe, selectKeyframes, deselectAllKeys, selectTracks, selectTrack,
        selectedKeyframeIds, snapshot, setIsScrubbing, seek,
        softSelectionEnabled, softSelectionRadius, setSoftSelection, softSelectionType
    } = useAnimationStore();

    const isDraggingRef = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const dragStartMousePos = useRef({ x: 0, y: 0 }); 
    const dragStartView = useRef<{ panX: number, panY: number }>({ panX: 0, panY: 0 });
    const dragMode = useRef<DragMode | null>(null);
    
    // New ref to track if drag distance was significant enough to block context menu
    const suppressContextMenuRef = useRef(false);
    
    const draggedKeysRef = useRef<KeyDragStart[]>([]);
    const draggedNeighborsRef = useRef<Map<string, NeighborKeyData>>(new Map());
    
    // Store ALL affected keys' initial values for soft selection to prevent drift/explosion
    const softSelectInitialStateRef = useRef<KeyStateMap>({});
    
    // Updated to store initial handle state for Angle Locking
    const dragHandleRef = useRef<{ 
        trackId: string, 
        keyId: string, 
        side: 'left' | 'right', 
        key: Keyframe,
        initialHandle: { x: number, y: number } 
    } | null>(null);
    
    const boxStartRef = useRef({ x: 0, y: 0 });
    const [selectionBox, setSelectionBox] = useState<{x:number, y:number, w:number, h:number} | null>(null);
    
    // Soft Selection Interaction State
    const [softInteraction, setSoftInteraction] = useState<{ isAdjusting: boolean, anchorKey: string | null }>({ isAdjusting: false, anchorKey: null });

    // Capture latest props in ref to avoid recreating event handlers
    const latestProps = useRef({
        view, normalized, trackRanges, sequence, currentFrame, 
        selectedKeyframeIds, trackIds, v2p,
        canvasPixelToFrame, frameToCanvasPixel,
        onSetScroll, onSetFrameWidth, setViewY,
        softSelectionEnabled, softSelectionRadius, setSoftSelection, softSelectionType
    });

    useEffect(() => {
        latestProps.current = { 
            view, normalized, trackRanges, sequence, currentFrame, 
            selectedKeyframeIds, trackIds, v2p,
            canvasPixelToFrame, frameToCanvasPixel,
            onSetScroll, onSetFrameWidth, setViewY,
            softSelectionEnabled, softSelectionRadius, setSoftSelection, softSelectionType
        };
    }, [view, normalized, trackRanges, sequence, currentFrame, selectedKeyframeIds, trackIds, v2p, canvasPixelToFrame, frameToCanvasPixel, onSetScroll, onSetFrameWidth, setViewY, softSelectionEnabled, softSelectionRadius, setSoftSelection, softSelectionType]);

    const getHit = (mx: number, my: number) => {
        for (const tid of trackIds) {
            const track = sequence.tracks[tid];
            if (!track) continue;
            
            for (const k of track.keyframes) {
                const isSelected = selectedKeyframeIds.includes(`${tid}::${k.id}`);
                if (!isSelected || k.interpolation !== 'Bezier') continue;
                
                // Left Handle
                if (k.leftTangent) {
                    const hxVal = k.frame + k.leftTangent.x;
                    const hyVal = normalized && trackRanges[tid] ? (k.value + k.leftTangent.y - trackRanges[tid].min) / trackRanges[tid].span : k.value + k.leftTangent.y;
                    const hx = frameToCanvasPixel(hxVal);
                    const hy = valueToPixel(hyVal, view);
                    if (Math.hypot(mx - hx, my - hy) < HIT_TOLERANCE) {
                        return { type: 'handle', trackId: tid, keyId: k.id, side: 'left', key: k } as const;
                    }
                }
                
                // Right Handle
                if (k.rightTangent) {
                    const hxVal = k.frame + k.rightTangent.x;
                    const hyVal = normalized && trackRanges[tid] ? (k.value + k.rightTangent.y - trackRanges[tid].min) / trackRanges[tid].span : k.value + k.rightTangent.y;
                    const hx = frameToCanvasPixel(hxVal);
                    const hy = valueToPixel(hyVal, view);
                    if (Math.hypot(mx - hx, my - hy) < HIT_TOLERANCE) {
                        return { type: 'handle', trackId: tid, keyId: k.id, side: 'right', key: k } as const;
                    }
                }
            }
        }

        // Keys check
        for (const tid of trackIds) {
            const track = sequence.tracks[tid];
            if (!track) continue;
            for (const k of track.keyframes) {
                const kx = frameToCanvasPixel(k.frame);
                const ky = v2p(k.value, tid);
                
                if (Math.abs(mx - kx) < HIT_TOLERANCE && Math.abs(my - ky) < HIT_TOLERANCE) {
                    return { type: 'key', trackId: tid, keyId: k.id, key: k } as const;
                }
            }
        }
        
        return null;
    };

    // Helper to sync track selection to key selection
    const syncTrackSelection = (keyIds: string[]) => {
        const uniqueTracks = new Set<string>();
        keyIds.forEach(id => {
            if (id) uniqueTracks.add(id.split('::')[0]);
        });
        
        const tracksArray = Array.from(uniqueTracks);
        if (tracksArray.length > 0) {
             selectTrack(tracksArray[0], false); // Replace list with [first]
             if (tracksArray.length > 1) {
                 selectTracks(tracksArray.slice(1), true); // Add rest
             }
        }
    };

    const handleGlobalMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        
        const props = latestProps.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mx = e.clientX - rect.left;
        
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        const totalDx = e.clientX - dragStartMousePos.current.x;
        const totalDy = e.clientY - dragStartMousePos.current.y;

        // If moved significantly, flag to suppress context menu (usually on Right Click / Alt+Right Click)
        if (Math.hypot(totalDx, totalDy) > 5) {
            suppressContextMenuRef.current = true;
        }

        if (dragMode.current === 'scrub') {
            const f = props.canvasPixelToFrame(mx);
            const safeFrame = Math.max(0, Math.round(f));
            seek(safeFrame);
            animationEngine.scrub(safeFrame);
        }
        else if (dragMode.current === 'scrub_passive') {
            const f = props.canvasPixelToFrame(mx);
            const safeFrame = Math.max(0, Math.round(f));
            seek(safeFrame);
            // No scrub call - just updates timeline UI
        }
        else if (dragMode.current === 'pan') {
            // Absolute panning using total delta to avoid state drift during heavy load
            const valDelta = totalDy / props.view.scaleY;
            const scrollPixels = (dragStartView.current.panX * props.view.scaleX) - totalDx;
            
            props.onSetScroll(scrollPixels);
            props.setViewY(prev => ({ ...prev, pan: dragStartView.current.panY + valDelta }));
        }
        else if (dragMode.current === 'zoom') {
            const zoomFactor = 1 + dx * 0.01;
            const newScaleX = Math.max(0.1, props.view.scaleX * zoomFactor);
            const mouseFrame = props.canvasPixelToFrame(mx);
            const newPanX = mouseFrame - ((mx - LEFT_GUTTER_WIDTH) / newScaleX);
            props.onSetFrameWidth(newScaleX);
            props.onSetScroll(newPanX * newScaleX);
            const valZoomFactor = 1 - dy * 0.01;
            const newScaleY = Math.max(0.1, props.view.scaleY * valZoomFactor);
            const my = e.clientY - rect.top;
            const centerY = rect.height / 2;
            const valAtMouse = props.view.panY + (centerY - my) / props.view.scaleY;
            const newPanY = valAtMouse - (centerY - my) / newScaleY;
            props.setViewY({ pan: newPanY, scale: newScaleY });
        }
        else if (dragMode.current === 'soft_radius') {
             const newRadius = Math.max(0, props.softSelectionRadius + (dx / props.view.scaleX));
             props.setSoftSelection(newRadius, true);
        }
        else if (dragMode.current === 'key') {
            const dFrame = totalDx / props.view.scaleX;
            const dVal = -totalDy / props.view.scaleY;
            const updates: any[] = [];
            
            // Soft Select Logic
            if (props.softSelectionEnabled && props.softSelectionRadius > 0) {
                 const tracksToProcess = new Set<string>();
                 draggedKeysRef.current.forEach(k => tracksToProcess.add(k.trackId));
                 
                 tracksToProcess.forEach(tid => {
                     const track = props.sequence.tracks[tid];
                     if (!track) return;

                     // Filter dragged keys that belong to this specific track for distance calculation
                     const selectionOnThisTrack = draggedKeysRef.current.filter(k => k.trackId === tid);

                     track.keyframes.forEach(k => {
                         const keyId = k.id;
                         const compositeId = `${tid}::${keyId}`;
                         const init = softSelectInitialStateRef.current[compositeId];
                         
                         // If not in our initial map, it wasn't captured (shouldn't happen if logic works)
                         if (!init) return;

                         // 1. Check if directly selected (Weight = 1.0)
                         const directDrag = selectionOnThisTrack.find(dk => dk.keyId === keyId);
                         if (directDrag) {
                             const newFrame = Math.max(0, Math.round(directDrag.startFrame + dFrame));
                             const newVal = directDrag.startVal + dVal;
                             updates.push({ trackId: tid, keyId: keyId, patch: { frame: newFrame, value: newVal } });
                             return;
                         }

                         // 2. Calculate Max Weight from nearby selected keys
                         // To match the visual renderer, we find the closest selected key and use its weight.
                         let maxWeight = 0;
                         
                         for (const sel of selectionOnThisTrack) {
                             const dist = Math.abs(init.f - sel.startFrame);
                             if (dist < props.softSelectionRadius) {
                                 const w = calculateSoftFalloff(dist, props.softSelectionRadius, props.softSelectionType);
                                 if (w > maxWeight) maxWeight = w;
                             }
                         }

                         // 3. Apply Update if weight > 0
                         if (maxWeight > 0) {
                             const neighborNewVal = init.v + (dVal * maxWeight);
                             const neighborNewFrame = Math.max(0, init.f + (dFrame * maxWeight));
                             updates.push({ 
                                 trackId: tid, 
                                 keyId: k.id, 
                                 patch: { 
                                     value: neighborNewVal,
                                     frame: Math.round(neighborNewFrame * 100) / 100 
                                 } 
                             });
                         }
                     });
                 });
            } else {
                // Standard Drag
                
                // 1. Cache new positions for neighbor lookups
                const draggedPositions = new Map<string, number>();
                draggedKeysRef.current.forEach(k => {
                    draggedPositions.set(k.keyId, Math.max(0, Math.round(k.startFrame + dFrame)));
                });

                draggedKeysRef.current.forEach(k => {
                    let newFrame = Math.max(0, Math.round(k.startFrame + dFrame));
                    let newVal = k.startVal + dVal;
                    const patch: Partial<Keyframe> = { frame: newFrame, value: newVal };
                    
                    const track = props.sequence.tracks[k.trackId];
                    if (track) {
                        const keysSorted = [...track.keyframes].sort((a,b) => a.frame - b.frame);
                        const currentKey = keysSorted.find(key => key.id === k.keyId);
                        if (currentKey) {
                             const idx = keysSorted.indexOf(currentKey);
                             const prev = idx > 0 ? keysSorted[idx - 1] : undefined;
                             const next = idx < keysSorted.length - 1 ? keysSorted[idx + 1] : undefined;
                             
                             // Scale handles proportionally to time change
                             // Use INITIAL tangent state to prevent compounding errors
                             const initialKeySnapshot = { 
                                 ...currentKey, 
                                 leftTangent: k.startLeftTan, 
                                 rightTangent: k.startRightTan 
                             };

                             const scalePatch = scaleKeyframeHandles(initialKeySnapshot, prev, next, k.startFrame, newFrame);
                             Object.assign(patch, scalePatch);

                             // Apply constraints
                             const movedKey = { ...currentKey, frame: newFrame, value: newVal, ...patch };
                             const constraintPatch = constrainKeyframeHandles(movedKey, prev, next);
                             Object.assign(patch, constraintPatch);
                        }
                    }
                    updates.push({ trackId: k.trackId, keyId: k.keyId, patch });
                });

                // Update Neighbors
                draggedNeighborsRef.current.forEach(neighbor => {
                    const patch: Partial<any> = {};

                    if (neighbor.rightReferenceKeyId && neighbor.startRightTan) {
                        const draggedPos = draggedPositions.get(neighbor.rightReferenceKeyId);
                        const draggedStartFrame = draggedKeysRef.current.find(k => k.keyId === neighbor.rightReferenceKeyId)?.startFrame;

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
                    
                    if (neighbor.leftReferenceKeyId && neighbor.startLeftTan) {
                        const draggedPos = draggedPositions.get(neighbor.leftReferenceKeyId);
                        const draggedStartFrame = draggedKeysRef.current.find(k => k.keyId === neighbor.leftReferenceKeyId)?.startFrame;
                        
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
            }
            
            updateKeyframes(updates);
            animationEngine.scrub(props.currentFrame); 
        }
        else if (dragMode.current === 'handle') {
            if (!dragHandleRef.current) return;
            const { trackId, keyId, side, initialHandle } = dragHandleRef.current;
            
            const track = props.sequence.tracks[trackId];
            if (!track) return;
            const currentKey = track.keyframes.find(k => k.id === keyId);
            if (!currentKey) return;
            
            const kx = props.frameToCanvasPixel(currentKey.frame);
            const ky = props.v2p(currentKey.value, trackId);
            
            let vecX = mx - kx;
            const my = e.clientY - rect.top;
            let vecY = my - ky;
            
            let frameDelta = vecX / props.view.scaleX;
            let valDelta = -vecY / props.view.scaleY;
            
            if (props.normalized) {
                const r = props.trackRanges[trackId];
                if (r) valDelta *= r.span;
            }
            
            // --- Shift Key: Lock Angle (Project onto original vector) ---
            if (e.shiftKey) {
                // Initial handle vector (dx, dy)
                const v0x = initialHandle.x;
                const v0y = initialHandle.y;
                
                // Current proposed vector
                const vx = frameDelta;
                const vy = valDelta;
                
                // Magnitude of original vector
                const len0 = Math.sqrt(v0x*v0x + v0y*v0y);
                
                if (len0 > 0.0001) {
                    // Normalize original
                    const nx = v0x / len0;
                    const ny = v0y / len0;
                    
                    // Dot product to project V onto N (Scalar projection)
                    // P = (V . N)
                    let projLen = (vx * nx) + (vy * ny);
                    
                    // New vector = N * projLen
                    frameDelta = nx * projLen;
                    valDelta = ny * projLen;
                }
            }

            const newHandle = { x: frameDelta, y: valDelta };
            const patch: Partial<Keyframe> = {};
            
            // --- Ctrl Key: Break Tangents ---
            const breakTangents = e.ctrlKey || currentKey.brokenTangents;
            if (breakTangents !== currentKey.brokenTangents) {
                patch.brokenTangents = breakTangents;
            }

            if (side === 'left') {
                patch.leftTangent = newHandle;
                if (!breakTangents && currentKey.rightTangent) {
                    patch.rightTangent = { x: -newHandle.x, y: -newHandle.y };
                }
            } else {
                patch.rightTangent = newHandle;
                if (!breakTangents && currentKey.leftTangent) {
                    patch.leftTangent = { x: -newHandle.x, y: -newHandle.y };
                }
            }
            patch.autoTangent = false;
            updateKeyframe(trackId, keyId, patch);
            animationEngine.scrub(props.currentFrame);
        }
        else if (dragMode.current === 'box') {
            if (boxStartRef.current) {
                const my = e.clientY - rect.top;
                setSelectionBox({
                    x: Math.min(mx, boxStartRef.current.x),
                    y: Math.min(my, boxStartRef.current.y),
                    w: Math.abs(mx - boxStartRef.current.x),
                    h: Math.abs(my - boxStartRef.current.y)
                });
            }
        }
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, [seek, updateKeyframe, updateKeyframes, LEFT_GUTTER_WIDTH]); 

    const handleGlobalUp = useCallback((e: MouseEvent) => {
        if (dragMode.current === 'scrub' || dragMode.current === 'scrub_passive') {
            setIsScrubbing(false);
        }
        
        isDraggingRef.current = false;
        const props = latestProps.current;
        
        if (dragMode.current === 'box' && boxStartRef.current) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                
                const x = Math.min(mx, boxStartRef.current.x);
                const y = Math.min(my, boxStartRef.current.y);
                const w = Math.abs(mx - boxStartRef.current.x);
                const h = Math.abs(my - boxStartRef.current.y);
                
                const newSelection: string[] = [];
                const isMulti = e.shiftKey || e.ctrlKey;
                
                (props.trackIds as string[]).forEach(tid => {
                    const track = props.sequence.tracks[tid];
                    if (!track) return;
                    track.keyframes.forEach(k => {
                        const kx = props.frameToCanvasPixel(k.frame);
                        const ky = props.v2p(k.value, tid);
                        
                        if (kx >= x && kx <= x + w &&
                            ky >= y && ky <= y + h) {
                            newSelection.push(`${tid}::${k.id}`);
                        }
                    });
                });
                
                selectKeyframes(newSelection, isMulti);
                
                // SYNC TRACK SELECTION TO KEYS
                const prevSet = new Set(props.selectedKeyframeIds as string[]);
                const resultingSet = new Set(isMulti ? prevSet : []);
                newSelection.forEach(id => resultingSet.add(id));
                
                const resultingArray = Array.from(resultingSet);
                
                if (resultingArray.length > 0) {
                    syncTrackSelection(resultingArray as string[]);
                }
            }
            setSelectionBox(null);
        }
        
        dragMode.current = null;
        draggedKeysRef.current = [];
        draggedNeighborsRef.current = new Map();
        softSelectInitialStateRef.current = {};
        dragHandleRef.current = null;
        setSoftInteraction({ isAdjusting: false, anchorKey: null });

        // IMPORTANT: Allow context menu again after short delay, but suppress it immediately after drag
        setTimeout(() => {
            suppressContextMenuRef.current = false;
        }, 100);
        
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [setIsScrubbing, selectKeyframes, handleGlobalMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Reset suppression immediately on new click
        suppressContextMenuRef.current = false;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const props = latestProps.current;

        lastMousePos.current = { x: e.clientX, y: e.clientY };
        dragStartMousePos.current = { x: e.clientX, y: e.clientY };
        
        // Capture initial view for absolute panning math
        dragStartView.current = { panX: props.view.panX, panY: props.view.panY };
        
        if (e.altKey) {
            if (e.button === 0) { dragMode.current = 'pan'; isDraggingRef.current = true; }
            if (e.button === 2) { dragMode.current = 'zoom'; isDraggingRef.current = true; }
        }
        else if (e.button === 1) { 
             e.preventDefault();
             // Middle Click: Pan on canvas, Scrub on Ruler
             if (my < RULER_HEIGHT) {
                 dragMode.current = 'scrub_passive'; 
                 isDraggingRef.current = true;
                 setIsScrubbing(true); 
                 const f = props.canvasPixelToFrame(mx);
                 seek(Math.max(0, Math.round(f)));
             } else {
                 dragMode.current = 'pan';
                 isDraggingRef.current = true;
             }
        }
        else if (e.button === 0) {
            if (my < RULER_HEIGHT) {
                dragMode.current = 'scrub';
                isDraggingRef.current = true;
                setIsScrubbing(true);
                const f = props.canvasPixelToFrame(mx);
                seek(Math.max(0, Math.round(f)));
                animationEngine.scrub(Math.max(0, Math.round(f)));
            } else {
                const hit = getHit(mx, my);
                
                if (hit) {
                    if (hit.type === 'handle') {
                        dragMode.current = 'handle';
                        
                        // Determine initial handle value for Angle Lock
                        let initH = { x: 0, y: 0 };
                        if (hit.side === 'left' && hit.key.leftTangent) initH = { ...hit.key.leftTangent };
                        else if (hit.side === 'right' && hit.key.rightTangent) initH = { ...hit.key.rightTangent };

                        dragHandleRef.current = { 
                            trackId: hit.trackId, 
                            keyId: hit.keyId, 
                            side: hit.side, 
                            key: hit.key,
                            initialHandle: initH
                        };
                        isDraggingRef.current = true;
                        snapshot();
                    }
                    else if (hit.type === 'key') {
                        const composite = `${hit.trackId}::${hit.key.id}`;
                        
                        if (e.ctrlKey && !dragHandleRef.current) { 
                             if (isDraggingRef.current) return; 
                             
                             dragMode.current = 'soft_radius';
                             isDraggingRef.current = true;
                             setSoftInteraction({ isAdjusting: true, anchorKey: composite });
                             
                             if (!props.softSelectionEnabled) props.setSoftSelection(props.softSelectionRadius || 10, true);
                             if (!(props.selectedKeyframeIds as string[]).includes(composite)) {
                                 selectKeyframe(hit.trackId, hit.keyId, false);
                                 syncTrackSelection([composite]);
                             }
                        } else {
                            dragMode.current = 'key';
                            const isMulti = e.shiftKey || e.metaKey; 
                            
                            if (!(props.selectedKeyframeIds as string[]).includes(composite)) {
                                if (!isMulti) deselectAllKeys();
                                selectKeyframe(hit.trackId, hit.keyId, true);
                            } 
                            
                            // SYNC TRACKS
                            const currentSelectedIds = props.selectedKeyframeIds as string[];
                            const effectiveSelection = currentSelectedIds.includes(composite) || isMulti 
                                ? (currentSelectedIds.includes(composite) ? currentSelectedIds : [...currentSelectedIds, composite])
                                : [composite];
                                
                            syncTrackSelection(effectiveSelection);

                            const keysToDrag: KeyDragStart[] = [];
                            const initialStates: KeyStateMap = {};
                            const neighbors = new Map<string, NeighborKeyData>();
                            
                            // Identify all involved tracks for initial state capture
                            const involvedTracks = new Set<string>();

                            effectiveSelection.forEach(id => {
                                if (!id) return;
                                const [tid, kid] = id.split('::');
                                const t = sequence.tracks[tid];
                                const k = t?.keyframes.find(kf => kf.id === kid);
                                if(k) {
                                   keysToDrag.push({ 
                                       trackId: tid, 
                                       keyId: k.id, 
                                       startFrame: k.frame, 
                                       startVal: k.value,
                                       // Capture initial tangents for correct scaling
                                       startLeftTan: k.leftTangent ? { ...k.leftTangent } : undefined,
                                       startRightTan: k.rightTangent ? { ...k.rightTangent } : undefined
                                   });
                                   initialStates[`${tid}::${k.id}`] = { f: k.frame, v: k.value };
                                   involvedTracks.add(tid);
                               }
                            });
                            
                            // Identify neighbors for handle adjustment
                            const draggedSet = new Set(effectiveSelection);
                            
                            keysToDrag.forEach(draggedKey => {
                                const track = sequence.tracks[draggedKey.trackId];
                                if (!track) return;
                                const sortedKeys = [...track.keyframes].sort((a,b) => a.frame - b.frame);
                                const idx = sortedKeys.findIndex(k => k.id === draggedKey.keyId);
                                if (idx === -1) return;
                                
                                if (idx > 0) {
                                    const prev = sortedKeys[idx-1];
                                    const prevId = `${draggedKey.trackId}::${prev.id}`;
                                    if (!draggedSet.has(prevId)) {
                                        if (!neighbors.has(prevId)) {
                                            neighbors.set(prevId, {
                                                trackId: draggedKey.trackId,
                                                keyId: prev.id,
                                                frame: prev.frame,
                                                startRightTan: prev.rightTangent ? {...prev.rightTangent} : undefined
                                            });
                                        }
                                        neighbors.get(prevId)!.rightReferenceKeyId = draggedKey.keyId;
                                    }
                                }
                                
                                if (idx < sortedKeys.length - 1) {
                                    const next = sortedKeys[idx+1];
                                    const nextId = `${draggedKey.trackId}::${next.id}`;
                                    if (!draggedSet.has(nextId)) {
                                        if (!neighbors.has(nextId)) {
                                            neighbors.set(nextId, {
                                                trackId: draggedKey.trackId,
                                                keyId: next.id,
                                                frame: next.frame,
                                                startLeftTan: next.leftTangent ? {...next.leftTangent} : undefined
                                            });
                                        }
                                        neighbors.get(nextId)!.leftReferenceKeyId = draggedKey.keyId;
                                    }
                                }
                            });
                            
                            // If soft selection enabled, capture initial states of ALL neighbors on involved tracks
                            if (props.softSelectionEnabled && props.softSelectionRadius > 0) {
                                involvedTracks.forEach(tid => {
                                    const track = sequence.tracks[tid];
                                    if (track) {
                                        track.keyframes.forEach(k => {
                                            const id = `${tid}::${k.id}`;
                                            if (!initialStates[id]) {
                                                initialStates[id] = { f: k.frame, v: k.value };
                                            }
                                        });
                                    }
                                });
                            }
                            
                            draggedKeysRef.current = keysToDrag;
                            draggedNeighborsRef.current = neighbors;
                            softSelectInitialStateRef.current = initialStates;
                            isDraggingRef.current = true;
                            snapshot();
                        }
                    }
                } else {
                    dragMode.current = 'box';
                    boxStartRef.current = { x: mx, y: my };
                    setSelectionBox({ x: mx, y: my, w: 0, h: 0 });
                    isDraggingRef.current = true;
                    if (!e.shiftKey && !e.ctrlKey) {
                        deselectAllKeys();
                    }
                }
            }
        }

        if (isDraggingRef.current) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
    };
    
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [handleGlobalMove, handleGlobalUp]);

    return {
        handleMouseDown,
        getHit,
        selectionBox,
        softInteraction,
        shouldSuppressContextMenu: () => suppressContextMenuRef.current
    };
};
