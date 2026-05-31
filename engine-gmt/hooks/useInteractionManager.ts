
import { useEffect, RefObject, useRef } from 'react';
import * as THREE from 'three';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { getDisplayCamera } from '../engine/worker/ViewportRefs';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { INTERACTION_SOURCES } from '../interaction/interactionSources';


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

    // ADR-0061 'picker' session — one token for both focus + julia pick-drags
    // (mutually exclusive via interactionMode). Ref keeps begin/end balanced
    // across pointerup / pointercancel / the RAF guards / unmount.
    const pickerSessionActive = useRef(false);

    // ADR-0061 'gizmo' session for the drag-a-light-in-from-the-HUD gesture
    // (CenterHUD sets draggedLightIndex; placement happens here on pointermove).
    // It positions a light, so it shares the 'gizmo' token with the gizmo-handle
    // drag (the two never overlap — this path self-gates on !isGizmoInteracting).
    const lightDragSessionActive = useRef(false);
    
    // Access Animation Store
    const animStore = useAnimationStore;

    useEffect(() => {
        const beginPickerSession = () => {
            if (pickerSessionActive.current) return;
            pickerSessionActive.current = true;
            useEngineStore.getState().beginInteraction(INTERACTION_SOURCES.picker);
        };
        const endPickerSession = () => {
            if (!pickerSessionActive.current) return;
            pickerSessionActive.current = false;
            useEngineStore.getState().endInteraction(INTERACTION_SOURCES.picker);
        };
        const endLightDragSession = () => {
            if (!lightDragSessionActive.current) return;
            lightDragSessionActive.current = false;
            useEngineStore.getState().endInteraction(INTERACTION_SOURCES.gizmo);
        };

        // Idempotent teardown for a pick kind — shared by pointerup, the RAF
        // guards (canvas-gone / pick-rejected, ADR mitigation #3), pointercancel,
        // and unmount cleanup, so the 'picker' session always releases with them.
        // Focus picking additionally tears down the worker focus snapshot.
        const endPickDrag = (
            dragRef: { current: boolean },
            cleanup?: () => void,
        ) => {
            if (!dragRef.current) return;
            dragRef.current = false;
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            cleanup?.();
            const s = useEngineStore.getState();
            s.setInteractionMode('none');
            s.handleInteractionEnd();
            endPickerSession();
        };
        const endFocusDrag = () => endPickDrag(isDraggingFocusRef, () => engine.endFocusPick());
        const endJuliaDrag = () => endPickDrag(isDraggingJuliaRef);

        const handlePointerDown = (e: PointerEvent) => {
            const state = useEngineStore.getState();
            const mode = state.interactionMode;

            // While any picking / region-select mode is active, kill the
            // event before it reaches drei's OrbitControls (registered on
            // the canvas DOM element). Without this, the very first
            // mouse-down of a pick gesture leaks through to OrbitControls
            // because React hasn't yet committed `enabled={!disableMovement}`
            // for that frame — the camera nudges before the lock takes
            // effect. capture:true on the listener (below) ensures we run
            // before OrbitControls' bubble-phase canvas handler.
            if (mode !== 'none' && mode !== undefined) {
                e.stopImmediatePropagation();
            }

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
                    beginPickerSession();
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
                    }).catch(() => endFocusDrag()); // mitigation #3: pick rejected → end + exit

                    const loop = () => {
                        // mitigation #3: canvas unmounted out from under the pick → release.
                        if (!canvasRef.current) { endFocusDrag(); return; }
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
                            }).catch(() => endFocusDrag()); // mitigation #3
                        }
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    rafRef.current = requestAnimationFrame(loop);
                }
                
                // Case 2: Julia Picking (Continuous Drag Mode, via worker RPC)
                if (mode === 'picking_julia') {
                    state.handleInteractionStart('param');
                    isDraggingJuliaRef.current = true;
                    beginPickerSession();

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
                    }).catch(() => endJuliaDrag()); // mitigation #3: pick rejected → end + exit

                    // Start Picking Loop
                    let pendingPick = false;
                    const loop = () => {
                        // mitigation #3: canvas unmounted out from under the pick → release.
                        if (!canvasRef.current) { endJuliaDrag(); return; }
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
                            }).catch(() => endJuliaDrag()); // mitigation #3
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
                    // Watchdog liveness (ADR open-Q) — keep a long pick-drag's
                    // session alive past MAX_SESSION_MS. Throttled, no store write.
                    useEngineStore.getState().pokeInteraction(INTERACTION_SOURCES.picker);
                }

                // Light drag-from-panel: place light at ray intersection with depth plane.
                // ADR-0061 P5 — the old `!engine.isGizmoInteracting` self-gate (don't place
                // a light while a gizmo HANDLE is being dragged) reads the unified `gizmo`
                // source now that the dual flag is gone. The handle drag and this light-drag
                // share the `gizmo` token, so "a gizmo HANDLE drag is active" = a hard-active
                // gizmo source that is NOT our own light-drag (tracked by lightDragSessionActive).
                const state = useEngineStore.getState();
                const gizmoHandleDragging = state.getInteractionSources().has(INTERACTION_SOURCES.gizmo) && !lightDragSessionActive.current;
                if (state.draggedLightIndex !== null && !gizmoHandleDragging) {
                    // ADR-0061 — open the 'gizmo' session on the first placement
                    // move, then poke to keep it alive (watchdog liveness). Ends
                    // in handlePointerUp / pointercancel / unmount.
                    if (!lightDragSessionActive.current) {
                        lightDragSessionActive.current = true;
                        state.beginInteraction(INTERACTION_SOURCES.gizmo);
                    } else {
                        state.pokeInteraction(INTERACTION_SOURCES.gizmo);
                    }
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
            endLightDragSession(); // release the HUD light-drag 'gizmo' session if it was active

            // End the active pick via the shared helpers (which also release the
            // 'picker' session). Vibrate once on release if a pick was active —
            // preserves the prior haptic without double-firing for both kinds.
            const wasPicking = isDraggingJuliaRef.current || isDraggingFocusRef.current;
            endJuliaDrag();
            endFocusDrag();
            if (wasPicking && navigator.vibrate) navigator.vibrate(20);
        };

        // capture:true so we run in the capture phase, BEFORE the
        // canvas-level OrbitControls listeners. Required so the
        // `stopImmediatePropagation` in handlePointerDown above can
        // actually suppress orbit's drag-start mid-pick.
        window.addEventListener('pointerdown', handlePointerDown, { capture: true });
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        // ADR-0061 mitigation #1 — a touch/OS interruption fires `pointercancel`,
        // not `pointerup`; route it through the same teardown so the 'picker'
        // session can't strand. These pickers don't setPointerCapture (they use a
        // capture-phase window pointerdown), so there's no lostpointercapture.
        window.addEventListener('pointercancel', handlePointerUp);
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown, { capture: true } as any);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            // Unmount mid-pick / mid-light-drag → release the sessions (idempotent).
            endJuliaDrag();
            endFocusDrag();
            endLightDragSession();
        };
    }, [canvasRef]);
};
