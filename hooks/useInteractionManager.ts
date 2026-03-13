
import { useEffect, RefObject, useRef } from 'react';
import * as THREE from 'three';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { getViewportCamera } from '../engine/worker/ViewportRefs';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';


export const useInteractionManager = (canvasRef: RefObject<HTMLDivElement>) => {
    // Julia Drag State
    const isDraggingJuliaRef = useRef(false);
    const targetJuliaRef = useRef(new THREE.Vector3());
    const currentJuliaRef = useRef(new THREE.Vector3());
    
    // Focus Drag State
    const isDraggingFocusRef = useRef(false);
    
    // Light drag-in sync (fly mode offset absorption)
    const lightDragSyncedRef = useRef(false);

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
                // Captures a depth snapshot (with DoF disabled) on click,
                // then samples from it as the user drags — no re-rendering needed.
                // DoF is re-enabled immediately so the user sees a live blur preview.
                if (mode === 'picking_focus') {
                    isDraggingFocusRef.current = true;
                    let snapshotReady = false;
                    let pendingSample = false;
                    let lastFocusDist = -1;

                    // Deactivate Focus Lock — user is manually picking, auto-sync would fight it
                    const store = useFractalStore.getState();
                    if (store.focusLock) store.setFocusLock(false);

                    // Start: disable DoF, render clean frame, capture depth
                    engine.startFocusPick(x, y).then((dist) => {
                        if (!isDraggingFocusRef.current) return;
                        snapshotReady = true;
                        if (dist > 0 && dist !== lastFocusDist) {
                            lastFocusDist = dist;
                            useFractalStore.getState().setOptics({ dofFocus: dist });
                        }
                    });

                    const loop = () => {
                        if (!isDraggingFocusRef.current) return;

                        if (snapshotReady && !pendingSample) {
                            pendingSample = true;
                            engine.sampleFocusPick(
                                mousePosRef.current.x,
                                mousePosRef.current.y
                            ).then((dist) => {
                                pendingSample = false;
                                if (!isDraggingFocusRef.current) return;

                                // Only update when distance changes — lets accumulation proceed on static frames
                                if (dist > 0 && dist !== lastFocusDist) {
                                    lastFocusDist = dist;
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
                            });
                        }
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    rafRef.current = requestAnimationFrame(loop);
                }
                
                // Case 2: Julia Picking (Continuous Drag Mode, via worker RPC)
                if (mode === 'picking_julia') {
                    isDraggingJuliaRef.current = true;

                    // Sync start position from store to prevent jumping
                    const geom = state.geometry;
                    currentJuliaRef.current.set(geom.juliaX, geom.juliaY, geom.juliaZ);
                    targetJuliaRef.current.copy(currentJuliaRef.current);

                    // Helper to map pick result to julia target
                    const applyPick = (pickPos: THREE.Vector3, formula: string, storeState: any) => {
                        if (formula === 'MandelTerrain') {
                            const cm = storeState.coreMath;
                            const zoom = Math.pow(2.0, cm.paramB);
                            targetJuliaRef.current.set(
                                pickPos.x * (2.0 / zoom) + cm.paramE,
                                pickPos.z * (2.0 / zoom) + cm.paramF,
                                0.0
                            );
                        } else if (formula === 'JuliaMorph') {
                            targetJuliaRef.current.set(pickPos.x, pickPos.y, 0.0);
                        } else {
                            targetJuliaRef.current.copy(pickPos);
                        }
                    };

                    // Initial Pick (async)
                    engine.pickWorldPosition(x, y, true).then((pick) => {
                        if (pick && isDraggingJuliaRef.current) {
                            applyPick(pick, state.formula, state);
                        }
                    });

                    // Start Picking Loop
                    let pendingPick = false;
                    const loop = () => {
                        if (!isDraggingJuliaRef.current) return;

                        // 1. Pick (async, throttled — skip if previous pick still pending)
                        if (!pendingPick) {
                            pendingPick = true;
                            engine.pickWorldPosition(mousePosRef.current.x, mousePosRef.current.y, true).then((pickPos) => {
                                pendingPick = false;
                                if (!isDraggingJuliaRef.current) return;
                                if (pickPos) {
                                    const freshState = useFractalStore.getState();
                                    applyPick(pickPos, freshState.formula, freshState);
                                }
                            });
                        }

                        // 2. Smooth Interpolation (Lerp) — runs every frame regardless of pick
                        currentJuliaRef.current.lerp(targetJuliaRef.current, 0.1);

                        // 3. Update Store if changed significantly
                        if (currentJuliaRef.current.distanceToSquared(targetJuliaRef.current) > 0.00000001) {
                             const freshState = useFractalStore.getState();
                             freshState.setGeometry({
                                 juliaX: currentJuliaRef.current.x,
                                 juliaY: currentJuliaRef.current.y,
                                 juliaZ: currentJuliaRef.current.z
                             });

                             // 4. Record Keyframe if Recording
                             const { isRecording, isPlaying, addKeyframe, addTrack, currentFrame, sequence } = animStore.getState();

                             if (isRecording) {
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
                // NOTE: This is for dragging lights from the panel list, NOT from the 3D gizmo
                // The LightGizmo component sets engine.isGizmoInteracting when handling drag
                const state = useFractalStore.getState();
                if (state.draggedLightIndex !== null && !engine.isGizmoInteracting) {
                    const cam = getViewportCamera() as THREE.PerspectiveCamera;
                    if (cam) {
                        // Fly mode offset sync: on first drag frame, absorb camera position
                        // into offset so main thread and worker agree on coordinates.
                        if (!lightDragSyncedRef.current && state.cameraMode === 'Fly') {
                            lightDragSyncedRef.current = true;
                            const so = engine.sceneOffset;
                            const absorbed = {
                                x: so.x, y: so.y, z: so.z,
                                xL: (so.xL ?? 0) + cam.position.x,
                                yL: (so.yL ?? 0) + cam.position.y,
                                zL: (so.zL ?? 0) + cam.position.z
                            };
                            cam.position.set(0, 0, 0);
                            cam.updateMatrixWorld();
                            state.setSceneOffset(absorbed);
                        }

                        const raycaster = new THREE.Raycaster();
                        raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
                        const targetDist = Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5));
                        const placementPos = new THREE.Vector3().copy(raycaster.ray.direction).multiplyScalar(targetDist).add(raycaster.ray.origin);
                        const so = engine.sceneOffset;
                        const absPos = { x: placementPos.x + (so.x + so.xL), y: placementPos.y + (so.y + so.yL), z: placementPos.z + (so.z + so.zL) };
                        
                        // When dragging from panel, light becomes world-space (not headlamp)
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
            lightDragSyncedRef.current = false;
            const state = useFractalStore.getState();
            if (state.draggedLightIndex !== null) state.setDraggedLight(null);
            
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
                engine.endFocusPick();

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
