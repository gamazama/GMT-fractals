
import React, { useRef, useMemo, useEffect } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import * as THREE from 'three';
import { SingleLightGizmo } from './components/SingleLightGizmo';
import { LightParams } from '../../types';
import { getViewportCamera, getViewportCanvas, getDisplayCamera } from '../../engine/worker/ViewportRefs';
import { normalizeLights } from './index';
import { INTERACTION_SOURCES } from '../../interaction/interactionSources';

// Global ref to store gizmo refs for orchestrated updates
const globalGizmoRefs = { current: {} as {[key: string]: { update: () => void; hide?: () => void }} };

// Export tick function for orchestrated updates
export const tick = () => {
    // Read lights once for visibility culling — avoids per-gizmo store reads
    const lights = useEngineStore.getState().lighting?.lights;
    if (!lights) return;

    // Heal any legacy lights still missing id/type/position/rotation.
    const migrated = normalizeLights(lights);
    if (migrated !== lights) {
        (useEngineStore.getState() as any).setLighting?.({ lights: migrated });
    }

    // Build ID→light lookup for culling
    const byId = new Map(lights.map(l => [l.id, l]));

    for (const [id, gizmo] of Object.entries(globalGizmoRefs.current)) {
        const light = byId.get(id);
        // Skip hidden or directional lights — just ensure container is hidden
        if (!light || !light.visible || light.type === 'Directional') {
            gizmo.hide?.();
            continue;
        }
        try {
            gizmo.update();
        } catch (e) {
            console.error('Error updating light gizmo:', e);
        }
    }
};

export const LightGizmo: React.FC<FeatureComponentProps> = () => {
    const showGizmo = useEngineStore(s => s.showLightGizmo);
    const lights = useEngineStore(s => s.lighting?.lights || []);
    const updateLight = useEngineStore(s => s.updateLight);
    const setDraggedLight = useEngineStore(s => s.setDraggedLight);
    const draggedLightId = useEngineStore(s => s.draggedLightIndex);
    const { handleInteractionStart, handleInteractionEnd } = useEngineStore();

    // Drag state — kept minimal. No captured offset; we always read engine.sceneOffset
    // fresh so the store-back conversion stays in sync with the gizmo display.
    const dragRef = useRef<{
        active: boolean;
        index: number;
        mode: string;
        startPos: THREE.Vector3;

        // Plane raycast (free = camera-perpendicular, constrained = geometric plane)
        planeNormal: THREE.Vector3;
        planeOrigin: THREE.Vector3;
        offsetFromIntersection: THREE.Vector3;

        // Screen-space axis for axis drags
        startX: number;
        startY: number;
        screenAxis: THREE.Vector2;
        worldAxis: THREE.Vector3;
    } | null>(null);

    const _plane = useMemo(() => new THREE.Plane(), []);
    const _raycaster = useMemo(() => new THREE.Raycaster(), []);

    // Gizmo refs for updating all in one loop
    const gizmoRefs = globalGizmoRefs;

    // ── ADR-0061 P5: gizmo is the InteractionSession's `gizmo` source ──────
    // The dual flags (`engine.isGizmoInteracting` + the uiSlice
    // `isGizmoDragging`) are gone — the gizmo drag is now represented ONLY by
    // the `gizmo` session, the single source of truth. Consumers that needed
    // the old flags read the session instead: the accumulation hold via the
    // filtered `sessionHoldActive` (camera/gizmo/scrub), and selectMovementLock
    // via `getInteractionSources().has('gizmo')`. `gizmoSessionActive` keeps the
    // begin/end balanced across the pointerup / pointercancel /
    // lostpointercapture / unmount release paths.
    const gizmoSessionActive = useRef(false);
    const applyGizmoInteracting = (active: boolean) => {
        if (active) {
            if (!gizmoSessionActive.current) {
                gizmoSessionActive.current = true;
                useEngineStore.getState().beginInteraction(INTERACTION_SOURCES.gizmo);
            }
        } else if (gizmoSessionActive.current) {
            gizmoSessionActive.current = false;
            useEngineStore.getState().endInteraction(INTERACTION_SOURCES.gizmo);
        }
    };

    // Unmount mid-drag (e.g. the gizmo is toggled off while held) → release the
    // session so it can't strand. The window listeners added in handlePointerDown
    // self-clean on the next pointerup via the dragRef guard.
    useEffect(() => () => { if (gizmoSessionActive.current) applyGizmoInteracting(false); }, []);

    const handlePointerDown = (e: React.PointerEvent, index: number, part: string, origin: THREE.Vector3) => {
        e.preventDefault();
        e.stopPropagation();

        const light = lights[index];
        if (!light) return;

        handleInteractionStart('param');
        applyGizmoInteracting(true);
        setDraggedLight(light.id ?? null);

        (e.target as Element).setPointerCapture(e.pointerId);

        // Use display camera — matches what SingleLightGizmo.update() uses for positioning
        const camera = getDisplayCamera();
        const canvasEl = getViewportCanvas();
        if (!camera || !canvasEl) return;

        // Raycast setup
        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        _raycaster.setFromCamera(ndc, camera);

        // --- PLANE / FREE DRAG ---
        if (part === 'free' || part.startsWith('plane')) {
            // Free drag: camera-perpendicular plane (always well-conditioned)
            // Constrained plane: use the actual geometric plane normal for 1:1 mouse tracking
            const normal = new THREE.Vector3();
            if (part === 'free') {
                camera.getWorldDirection(normal);
            } else if (part === 'plane-xy') {
                normal.set(0, 0, 1);
            } else if (part === 'plane-xz') {
                normal.set(0, 1, 0);
            } else if (part === 'plane-yz') {
                normal.set(1, 0, 0);
            }
            if (part !== 'free' && light.fixed) {
                normal.applyQuaternion(camera.quaternion);
            }

            _plane.setFromNormalAndCoplanarPoint(normal, origin);

            const intersect = new THREE.Vector3();
            const hit = _raycaster.ray.intersectPlane(_plane, intersect);
            const offsetFromIntersection = hit
                ? new THREE.Vector3().subVectors(origin, intersect)
                : new THREE.Vector3(0, 0, 0);

            dragRef.current = {
                active: true, index, mode: part,
                startPos: origin.clone(),
                planeNormal: normal, planeOrigin: origin, offsetFromIntersection,
                startX: e.clientX, startY: e.clientY,
                screenAxis: new THREE.Vector2(), worldAxis: new THREE.Vector3()
            };
        }

        // --- AXIS DRAG ---
        else if (part.startsWith('axis')) {
             let axis = new THREE.Vector3();
             if (part === 'axis-x') axis.set(1, 0, 0);
             if (part === 'axis-y') axis.set(0, 1, 0);
             if (part === 'axis-z') axis.set(0, 0, 1);

             if (light.fixed) axis.applyQuaternion(camera.quaternion);

             // Project axis to screen for robust delta mapping
             const gizmoLen = origin.distanceTo(camera.position) * 0.15;
             const axisEnd = origin.clone().addScaledVector(axis, gizmoLen);

             const p1 = origin.clone().project(camera);
             const p2 = axisEnd.clone().project(camera);

             const axisRect = canvasEl.getBoundingClientRect();
             let sx = (p2.x - p1.x) * axisRect.width * 0.5;
             let sy = -(p2.y - p1.y) * axisRect.height * 0.5;

             const tipViewZ = axisEnd.applyMatrix4(camera.matrixWorldInverse).z;
             if (tipViewZ > 0) { sx = -sx; sy = -sy; }

             let sVec = new THREE.Vector2(sx, sy);
             if (sVec.lengthSq() < 0.5) sVec.set(1, 0);
             sVec.normalize();

             dragRef.current = {
                 active: true, index, mode: part,
                 startPos: origin.clone(),
                 planeNormal: new THREE.Vector3(), planeOrigin: new THREE.Vector3(),
                 offsetFromIntersection: new THREE.Vector3(),
                 startX: e.clientX, startY: e.clientY,
                 screenAxis: sVec, worldAxis: axis
             };
        }

        window.addEventListener('pointermove', handlePointerMove as any);
        window.addEventListener('pointerup', handlePointerUp as any);
        // ADR-0061 mitigation #1 — this drag DOES setPointerCapture, so a
        // capture loss (`lostpointercapture`) or touch/OS interruption
        // (`pointercancel`) can end the gesture without a `pointerup`. Both
        // route to handlePointerUp, which is idempotent (dragRef guard).
        window.addEventListener('pointercancel', handlePointerUp as any);
        window.addEventListener('lostpointercapture', handlePointerUp as any);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || !drag.active) return;

        e.preventDefault();
        e.stopPropagation();

        // Watchdog liveness (ADR open-Q) — a long gizmo drag refreshes the
        // session so it isn't force-cleared at MAX_SESSION_MS. Throttled
        // (~50ms), timestamp-only (no store write).
        useEngineStore.getState().pokeInteraction(INTERACTION_SOURCES.gizmo);

        // Use display camera — matches what SingleLightGizmo.update() uses for positioning
        const camera = getDisplayCamera();
        if (!camera) return;

        // Read light fresh from store
        const currentLights = useEngineStore.getState().lighting?.lights || [];
        const light = currentLights[drag.index];
        if (!light) return;

        let newWorldPos = new THREE.Vector3();

        // --- PLANE / FREE DRAG ---
        // Free: camera-perpendicular plane. Constrained: actual geometric plane.
        // Both use direct raycast — no axis projection needed.
        if (drag.mode === 'free' || drag.mode.startsWith('plane')) {
            const canvasEl = getViewportCanvas();
            if (!canvasEl) return;
            const rect = canvasEl.getBoundingClientRect();
            const ndc = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            _raycaster.setFromCamera(ndc, camera);
            _plane.setFromNormalAndCoplanarPoint(drag.planeNormal, drag.planeOrigin);

            const intersect = new THREE.Vector3();
            if (_raycaster.ray.intersectPlane(_plane, intersect)) {
                newWorldPos.copy(intersect).add(drag.offsetFromIntersection);
            } else {
                return;
            }
        }

        // --- AXIS DRAG ---
        else {
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;

            const dist = (dx * drag.screenAxis.x) + (dy * drag.screenAxis.y);
            const camDist = drag.startPos.distanceTo(camera.position);
            const scale = camDist * 0.0025;

            newWorldPos.copy(drag.startPos).addScaledVector(drag.worldAxis, dist * scale);
        }

        // --- SNAP TO GRID (Shift held) ---
        if (e.shiftKey) {
            const snap = 0.25;
            newWorldPos.x = Math.round(newWorldPos.x / snap) * snap;
            newWorldPos.y = Math.round(newWorldPos.y / snap) * snap;
            newWorldPos.z = Math.round(newWorldPos.z / snap) * snap;
        }

        // --- CONVERT BACK TO STORE SPACE ---
        // Always read sceneOffset fresh — matches what the gizmo display uses.
        const so = engine.sceneOffset;
        let finalPos: { x: number; y: number; z: number };

        if (light.fixed) {
            // Headlamp: world → camera-local
            const local = newWorldPos.clone().sub(camera.position)
                .applyQuaternion(camera.quaternion.clone().invert());
            finalPos = { x: local.x, y: local.y, z: local.z };
        } else {
            // World-anchored: world → absolute store coords
            finalPos = {
                x: newWorldPos.x + so.x + (so.xL ?? 0),
                y: newWorldPos.y + so.y + (so.yL ?? 0),
                z: newWorldPos.z + so.z + (so.zL ?? 0)
            };
        }

        useEngineStore.getState().updateLight({
            index: drag.index,
            params: { position: finalPos }
        });
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (!dragRef.current) return;
        applyGizmoInteracting(false); // single-source: dual flags + session end together
        setDraggedLight(null);
        handleInteractionEnd();

        dragRef.current = null;

        window.removeEventListener('pointermove', handlePointerMove as any);
        window.removeEventListener('pointerup', handlePointerUp as any);
        window.removeEventListener('pointercancel', handlePointerUp as any);
        window.removeEventListener('lostpointercapture', handlePointerUp as any);
    };

    // While a Directional light is being dragged in from the Light Studio, glow
    // the canvas edge the light is coming FROM. The drop point already aims the
    // sun (padCoordToLightEuler), so we project the light's "from" direction
    // (−direction) into view space and place the glow at that screen edge. Shown
    // regardless of `showGizmo` — it's a drag affordance, not a gizmo.
    const dirGlow = computeDirectionalDragGlow(draggedLightId, lights);

    return (
        <div className="absolute inset-0 pointer-events-none">
            {dirGlow && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute inset-0"
                        style={{
                            opacity: dirGlow.opacity,
                            background: `radial-gradient(circle at ${dirGlow.px}% ${dirGlow.py}%, ${dirGlow.rgb} 0%, ${dirGlow.rgbFade} 9%, transparent 38%)`,
                            mixBlendMode: 'screen',
                        }}
                    />
                </div>
            )}
            {showGizmo && lights.map((l, i) => (
                <SingleLightGizmo
                    key={l.id || i}
                    index={i}
                    light={l}
                    onDragStart={handlePointerDown}
                    ref={(el) => {
                        const id = l.id;
                        if (id) {
                            if (el) {
                                gizmoRefs.current[id] = el;
                            } else {
                                delete gizmoRefs.current[id];
                            }
                        }
                    }}
                />
            ))}
        </div>
    );
};

const hexToRgbTriple = (hex: string): [number, number, number] => {
    let h = (hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(n)) return [255, 255, 255];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Edge-glow descriptor for the directional drag affordance, or null when no
 * Directional light is mid-drag. `px/py` are percent coords on the canvas of
 * the glow centre (sits on the border the light comes from); `opacity` ramps
 * with how far off-forward the sun is (≈0 when it would come from behind you).
 */
const computeDirectionalDragGlow = (
    draggedLightId: string | null,
    lights: LightParams[]
): { px: number; py: number; opacity: number; rgb: string; rgbFade: string } | null => {
    if (!draggedLightId) return null;
    const light = lights.find(l => l.id === draggedLightId);
    if (!light || light.type !== 'Directional') return null;

    const cam = getDisplayCamera();
    if (!cam) return null;

    const rot = light.rotation;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(rot.x, rot.y, rot.z, 'YXZ'));
    // World-anchored sun: rotate the world direction into view space. Headlamp
    // sun is already stored relative to the camera, so leave it.
    if (!light.fixed) dir.applyQuaternion(cam.quaternion.clone().invert());

    // Screen-plane projection of the "comes-from" direction (−dir). View +y is
    // up, screen +y is down → screenY = −(−dir.y) = dir.y; screenX = −dir.x.
    const sx = -dir.x;
    const sy = dir.y;
    const mag = Math.hypot(sx, sy); // sin(deviation): 0 = from behind viewer, 1 = side-on

    const [r, g, b] = hexToRgbTriple(light.color);
    const px = mag < 1e-4 ? 50 : 50 + (sx / mag) * 50;
    const py = mag < 1e-4 ? 50 : 50 + (sy / mag) * 50;
    const opacity = Math.min(0.85, mag * 1.15);

    return {
        px, py, opacity,
        rgb: `rgba(${r},${g},${b},0.85)`,
        rgbFade: `rgba(${r},${g},${b},0.35)`,
    };
};

export default LightGizmo;
