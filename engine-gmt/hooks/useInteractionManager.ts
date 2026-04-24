
import { useEffect, RefObject, useRef } from 'react';
import * as THREE from 'three';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { getDisplayCamera } from '../engine/worker/ViewportRefs';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';


/** Record keyframe(s) if the animation system is in recording mode. */
const recordPickKeyframes = (
    animStore: typeof useAnimationStore,
    tracks: { id: string; label: string; value: number }[]
) => {
    const { isRecording, isPlaying, addKeyframe, addTrack, currentFrame, sequence } = animStore.getState();
    if (!isRecording) return;
    const interp = isPlaying ? 'Linear' : 'Bezier';
    for (const t of tracks) {
        if (!sequence.tracks[t.id]) addTrack(t.id, t.label);
        addKeyframe(t.id, currentFrame, t.value, interp);
    }
};

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
            const state = useEngineStore.getState();
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
                    state.handleInteractionStart('param');
                    isDraggingFocusRef.current = true;
                    let snapshotReady = false;
                    let pendingSample = false;
                    let lastFocusDist = -1;

                    // Deactivate Focus Lock — user is manually picking, auto-sync would fight it
                    const store = useEngineStore.getState();
                    if (store.focusLock) store.setFocusLock(false);

                    // Start: disable DoF, render clean frame, capture depth
                    engine.startFocusPick(x, y).then((dist) => {
                        if (!isDraggingFocusRef.current) return;
                        snapshotReady = true;
                        if (dist > 0 && dist !== lastFocusDist) {
                            lastFocusDist = dist;
                            useEngineStore.getState().setOptics({ dofFocus: dist });
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
                                    useEngineStore.getState().setOptics({ dofFocus: dist });

                                    recordPickKeyframes(animStore, [
                                        { id: 'optics.dofFocus', label: 'Focus Distance', value: dist }
                                    ]);
                                }
                            });
                        }
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    rafRef.current = requestAnimationFrame(loop);
                }
                
                // Case 2: Julia Picking (Continuous Drag Mode, via worker RPC)
                if (mode === 'picking_julia') {
                    state.handleInteractionStart('param');
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
                    engine.pickWorldPosition(x, y, true, true).then((pick) => {
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
                            engine.pickWorldPosition(mousePosRef.current.x, mousePosRef.current.y, true, true).then((pickPos) => {
                                pendingPick = false;
                                if (!isDraggingJuliaRef.current) return;
                                if (pickPos) {
                                    const freshState = useEngineStore.getState();
                                    applyPick(pickPos, freshState.formula, freshState);
                                }
                            });
                        }

                        // 2. Smooth Interpolation (Lerp) — runs every frame regardless of pick
                        currentJuliaRef.current.lerp(targetJuliaRef.current, 0.1);

                        // 3. Update Store if changed significantly
                        if (currentJuliaRef.current.distanceToSquared(targetJuliaRef.current) > 0.00000001) {
                             const freshState = useEngineStore.getState();
                             freshState.setGeometry({
                                 juliaX: currentJuliaRef.current.x,
                                 juliaY: currentJuliaRef.current.y,
                                 juliaZ: currentJuliaRef.current.z
                             });

                             recordPickKeyframes(animStore, [
                                 { id: 'geometry.juliaX', label: 'Julia X', value: currentJuliaRef.current.x },
                                 { id: 'geometry.juliaY', label: 'Julia Y', value: currentJuliaRef.current.y },
                                 { id: 'geometry.juliaZ', label: 'Julia Z', value: currentJuliaRef.current.z },
                             ]);
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

                // Light drag-from-panel: place light at ray intersection with depth plane
                const state = useEngineStore.getState();
                if (state.draggedLightIndex !== null && !engine.isGizmoInteracting) {
                    // Use display camera — matches gizmo rendering
                    const cam = getDisplayCamera() as THREE.PerspectiveCamera;
                    const dragIdx = state.lighting?.lights?.findIndex(l => l.id === state.draggedLightIndex) ?? -1;
                    if (cam && dragIdx >= 0) {
                        const raycaster = new THREE.Raycaster();
                        raycaster.setFromCamera(new THREE.Vector2(x, y), cam);

                        // Place at half the measured surface distance along the ray
                        const targetDist = Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5));
                        const worldPos = raycaster.ray.direction.clone().multiplyScalar(targetDist).add(raycaster.ray.origin);

                        // Convert world → store space
                        const so = engine.sceneOffset;
                        const draggedLight = state.lighting.lights[dragIdx];

                        let finalPos: { x: number; y: number; z: number };
                        if (draggedLight.fixed && draggedLight.visible) {
                            // Headlamp: world → camera-local
                            const local = worldPos.clone().sub(cam.position)
                                .applyQuaternion(cam.quaternion.clone().invert());
                            finalPos = { x: local.x, y: local.y, z: local.z };
                        } else {
                            // World-anchored: world → absolute store coords
                            finalPos = {
                                x: worldPos.x + so.x + (so.xL ?? 0),
                                y: worldPos.y + so.y + (so.yL ?? 0),
                                z: worldPos.z + so.z + (so.zL ?? 0)
                            };
                        }

                        const placementParams: Record<string, any> = { visible: true, castShadow: true, position: finalPos };
                        if (!draggedLight.visible) placementParams.fixed = false;
                        state.updateLight({ index: dragIdx, params: placementParams });

                        if (!state.lighting.shadows) state.setLighting({ shadows: true });
                        if (!state.showLightGizmo) state.setShowLightGizmo(true);
                    }
                }
            }
        };

        const handlePointerUp = () => {
            const state = useEngineStore.getState();
            if (state.draggedLightIndex !== null) state.setDraggedLight(null);
            
            // End Julia Drag
            if (isDraggingJuliaRef.current) {
                isDraggingJuliaRef.current = false;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);

                // Exit picking mode on release
                state.setInteractionMode('none');
                state.handleInteractionEnd();
                if (navigator.vibrate) navigator.vibrate(20);
            }

            // End Focus Drag
            if (isDraggingFocusRef.current) {
                isDraggingFocusRef.current = false;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                engine.endFocusPick();

                // Exit picking mode on release
                state.setInteractionMode('none');
                state.handleInteractionEnd();
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
