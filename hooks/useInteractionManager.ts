
import { useEffect, RefObject, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';

export const useInteractionManager = (canvasRef: RefObject<HTMLDivElement>) => {
    // Julia Drag State
    const isDraggingJuliaRef = useRef(false);
    const targetJuliaRef = useRef(new THREE.Vector3());
    const currentJuliaRef = useRef(new THREE.Vector3());
    
    // Focus Drag State
    const isDraggingFocusRef = useRef(false);
    
    // Shared Loop Refs
    const rafRef = useRef<number | null>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    
    // Access Animation Store
    const animStore = useAnimationStore;

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            const state = useFractalStore.getState();
            const mode = state.interactionMode;

            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                
                // Update tracker immediately
                mousePosRef.current = { x, y };
                
                // Case 1: Focus Picking
                if (mode === 'picking_focus') {
                    isDraggingFocusRef.current = true;
                    
                    const loop = () => {
                        if (!isDraggingFocusRef.current) return;
                        
                        if (engine.renderer && engine.activeCamera) {
                            const dist = engine.measureDistanceAtScreenPoint(
                                mousePosRef.current.x, 
                                mousePosRef.current.y, 
                                engine.renderer, 
                                engine.activeCamera
                            );
                            
                            if (dist > 0) {
                                useFractalStore.getState().setOptics({ dofFocus: dist });

                                // Record Keyframe if Recording
                                const { isRecording, isPlaying, addKeyframe, addTrack, currentFrame, sequence } = animStore.getState();
                                
                                if (isRecording) {
                                    const trackId = 'optics.dofFocus';
                                    if (!sequence.tracks[trackId]) addTrack(trackId, 'Focus Distance');
                                    
                                    const interp = isPlaying ? 'Linear' : 'Bezier';
                                    addKeyframe(trackId, currentFrame, dist, interp);
                                }
                            }
                        }
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    rafRef.current = requestAnimationFrame(loop);
                }
                
                // Case 2: Julia Picking (Continuous Drag Mode)
                if (mode === 'picking_julia') {
                    isDraggingJuliaRef.current = true;
                    
                    // Sync start position from store to prevent jumping
                    const geom = state.geometry;
                    currentJuliaRef.current.set(geom.juliaX, geom.juliaY, geom.juliaZ);
                    
                    // Initial Pick
                    const pick = engine.pickWorldPosition(x, y);
                    
                    if (pick) {
                        // MANDELTERRAIN SPECIAL CASE:
                        // Map picked world position to Complex Plane coordinates using Pan/Zoom params.
                        if (state.formula === 'MandelTerrain') {
                            const cm = state.coreMath;
                            // Formula: vec2 mapPos = p * (2.0 / zoom) + center;
                            // p is world xz. mapPos is the complex coord we want for Julia.
                            const zoom = Math.pow(2.0, cm.paramB);
                            const centerX = cm.paramE;
                            const centerY = cm.paramF;
                            
                            const mappedX = pick.x * (2.0 / zoom) + centerX;
                            const mappedY = pick.z * (2.0 / zoom) + centerY;
                            
                            targetJuliaRef.current.set(mappedX, mappedY, 0.0);
                        } 
                        // JULIA MORPH SPECIAL CASE:
                        // Map picked X/Y to Julia X/Y (Real/Imag). Z is not used for C in this formula.
                        else if (state.formula === 'JuliaMorph') {
                            targetJuliaRef.current.set(pick.x, pick.y, 0.0);
                        }
                        else {
                            targetJuliaRef.current.copy(pick);
                        }
                    } else {
                        // If picking sky, stay at current
                        targetJuliaRef.current.copy(currentJuliaRef.current);
                    }
                    
                    // Start Picking Loop
                    const loop = () => {
                        if (!isDraggingJuliaRef.current) return;
                        
                        // 1. Pick (Throttled to Frame Rate via RAF)
                        // We use the latest mouse position from the ref
                        const pickPos = engine.pickWorldPosition(mousePosRef.current.x, mousePosRef.current.y);
                        
                        // 3. Update Store (Need fresh state inside loop)
                        const freshState = useFractalStore.getState();
                        
                        if (pickPos) {
                            if (freshState.formula === 'MandelTerrain') {
                                const cm = freshState.coreMath;
                                const zoom = Math.pow(2.0, cm.paramB);
                                const centerX = cm.paramE;
                                const centerY = cm.paramF;
                                
                                const mappedX = pickPos.x * (2.0 / zoom) + centerX;
                                const mappedY = pickPos.z * (2.0 / zoom) + centerY;
                                
                                targetJuliaRef.current.set(mappedX, mappedY, 0.0);
                            } 
                            else if (freshState.formula === 'JuliaMorph') {
                                // For Julia Morph, we essentially "paint" the start shape with the X/Y world coords
                                targetJuliaRef.current.set(pickPos.x, pickPos.y, 0.0);
                            }
                            else {
                                targetJuliaRef.current.copy(pickPos);
                            }
                        }
                        
                        // 2. Smooth Interpolation (Lerp)
                        // Factor 0.1 gives smoother movement, 0.2 is snappier.
                        currentJuliaRef.current.lerp(targetJuliaRef.current, 0.1);
                        
                        // Optimization: Only update if changed significantly
                        if (currentJuliaRef.current.distanceToSquared(targetJuliaRef.current) > 0.00000001 || pickPos) {
                             freshState.setGeometry({ 
                                 juliaX: currentJuliaRef.current.x, 
                                 juliaY: currentJuliaRef.current.y, 
                                 juliaZ: currentJuliaRef.current.z 
                             });
                             
                             // 4. Record Keyframe if Recording
                             const { isRecording, isPlaying, addKeyframe, addTrack, currentFrame, sequence } = animStore.getState();
                             
                             if (isRecording) {
                                 // Add tracks if missing
                                 if (!sequence.tracks['geometry.juliaX']) addTrack('geometry.juliaX', 'Julia X');
                                 if (!sequence.tracks['geometry.juliaY']) addTrack('geometry.juliaY', 'Julia Y');
                                 if (!sequence.tracks['geometry.juliaZ']) addTrack('geometry.juliaZ', 'Julia Z');
                                 
                                 const interp = isPlaying ? 'Linear' : 'Bezier';
                                 
                                 addKeyframe('geometry.juliaX', currentFrame, currentJuliaRef.current.x, interp);
                                 addKeyframe('geometry.juliaY', currentFrame, currentJuliaRef.current.y, interp);
                                 addKeyframe('geometry.juliaZ', currentFrame, currentJuliaRef.current.z, interp);
                             }
                        }
                        
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    
                    rafRef.current = requestAnimationFrame(loop);
                }
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                
                // Update ref for the Picking Loop
                if (isDraggingJuliaRef.current || isDraggingFocusRef.current) {
                    mousePosRef.current = { x, y };
                }

                // Existing Light Gizmo Drag Logic
                const state = useFractalStore.getState();
                if (state.draggedLightIndex !== null) {
                    const cam = engine.activeCamera as THREE.PerspectiveCamera;
                    if (cam) {
                        const raycaster = new THREE.Raycaster();
                        raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
                        const targetDist = Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5));
                        const placementPos = new THREE.Vector3().copy(raycaster.ray.direction).multiplyScalar(targetDist).add(raycaster.ray.origin); 
                        const so = engine.sceneOffset;
                        const absPos = { x: placementPos.x + (so.x + so.xL), y: placementPos.y + (so.y + so.yL), z: placementPos.z + (so.z + so.zL) };
                        
                        // Updated to use DDFS action
                        state.updateLight({ 
                            index: state.draggedLightIndex, 
                            params: { fixed: false, visible: true, castShadow: true, position: absPos }
                        });
                        
                        if (!state.lighting.shadows) state.setLighting({ shadows: true });
                        if (!state.showLightGizmo) state.setShowLightGizmo(true);
                    }
                }
            }
        };

        const handlePointerUp = () => {
            const state = useFractalStore.getState();
            state.setDraggedLight(null);
            
            // End Julia Drag
            if (isDraggingJuliaRef.current) {
                isDraggingJuliaRef.current = false;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                
                // Exit picking mode on release
                state.setInteractionMode('none');
                if (navigator.vibrate) navigator.vibrate(20);
            }
            
            // End Focus Drag
            if (isDraggingFocusRef.current) {
                isDraggingFocusRef.current = false;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                
                // Exit picking mode on release
                state.setInteractionMode('none');
                if (navigator.vibrate) navigator.vibrate(20);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [canvasRef]);
};
