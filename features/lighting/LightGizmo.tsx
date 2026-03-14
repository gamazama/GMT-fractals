
import React, { useRef, useMemo, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import * as THREE from 'three';
import { SingleLightGizmo } from './components/SingleLightGizmo';
import { getViewportCamera, getViewportCanvas } from '../../engine/worker/ViewportRefs';
import { ensureLightIds } from './index';

// Global ref to store gizmo refs for orchestrated updates
const globalGizmoRefs = { current: {} as {[key: string]: { update: () => void; hide?: () => void }} };

// Export tick function for orchestrated updates
let _idsMigrated = false;
export const tick = () => {
    // Read lights once for visibility culling — avoids per-gizmo store reads
    const lights = useFractalStore.getState().lighting?.lights;
    if (!lights) return;

    // One-time migration: ensure all lights have stable IDs (legacy state compat)
    if (!_idsMigrated) {
        _idsMigrated = true;
        const migrated = ensureLightIds(lights);
        if (migrated !== lights) {
            (useFractalStore.getState() as any).setLighting?.({ lights: migrated });
        }
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
    const showGizmo = useFractalStore(s => s.showLightGizmo);
    const lights = useFractalStore(s => s.lighting?.lights || []);
    const setGizmoDragging = useFractalStore(s => s.setGizmoDragging);
    const updateLight = useFractalStore(s => s.updateLight);
    const setDraggedLight = useFractalStore(s => s.setDraggedLight);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();

    // Interaction State
    const dragRef = useRef<{
        active: boolean;
        index: number;
        mode: string;
        startX: number;
        startY: number;
        startPos: THREE.Vector3;

        // Captured at drag start — must stay consistent throughout the drag
        sceneOffset: { x: number; y: number; z: number; xL: number; yL: number; zL: number };

        // For Plane Dragging
        planeNormal: THREE.Vector3;
        planeOrigin: THREE.Vector3;
        offsetFromIntersection: THREE.Vector3;

        // For Axis Dragging
        screenAxis: THREE.Vector2;
        worldAxis: THREE.Vector3;
    } | null>(null);

    const _plane = useMemo(() => new THREE.Plane(), []);
    const _raycaster = useMemo(() => new THREE.Raycaster(), []);

    // Gizmo refs for updating all in one loop
    const gizmoRefs = globalGizmoRefs;

    const handlePointerDown = (e: React.PointerEvent, index: number, part: string, origin: THREE.Vector3) => {
        e.preventDefault();
        e.stopPropagation();

        const light = lights[index];
        if (!light) return;

        handleInteractionStart('param');
        setGizmoDragging(true);
        engine.isGizmoInteracting = true;
        setDraggedLight(light.id);

        (e.target as Element).setPointerCapture(e.pointerId);

        const camera = getViewportCamera();
        const canvasEl = getViewportCanvas();
        if (!camera || !canvasEl) return;

        // Capture offset at drag start — must stay consistent for the entire drag
        const so = engine.sceneOffset || useFractalStore.getState().sceneOffset;
        const capturedOffset = { x: so.x, y: so.y, z: so.z, xL: so.xL ?? 0, yL: so.yL ?? 0, zL: so.zL ?? 0 };

        // Raycast Setup
        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        _raycaster.setFromCamera(ndc, camera);

        // --- PLANE DRAG ---
        if (part.startsWith('plane') || part === 'free') {
            let normal = new THREE.Vector3();

            if (part === 'free') {
                camera.getWorldDirection(normal);
            } else if (part === 'plane-xy') {
                normal.set(0, 0, 1);
            } else if (part === 'plane-xz') {
                normal.set(0, 1, 0);
            } else if (part === 'plane-yz') {
                normal.set(1, 0, 0);
            }

            if (light.fixed && part !== 'free') {
                normal.applyQuaternion(camera.quaternion);
            }

            _plane.setFromNormalAndCoplanarPoint(normal, origin);

            const intersect = new THREE.Vector3();
            const hit = _raycaster.ray.intersectPlane(_plane, intersect);

            // If ray doesn't hit plane (parallel view), use origin as fallback
            const offsetFromIntersection = hit
                ? new THREE.Vector3().subVectors(origin, intersect)
                : new THREE.Vector3(0, 0, 0);

            dragRef.current = {
                active: true,
                index,
                mode: part,
                startX: e.clientX,
                startY: e.clientY,
                startPos: origin.clone(),
                sceneOffset: capturedOffset,
                planeNormal: normal,
                planeOrigin: origin,
                offsetFromIntersection,
                screenAxis: new THREE.Vector2(),
                worldAxis: new THREE.Vector3()
            };
        }

        // --- AXIS DRAG ---
        else if (part.startsWith('axis')) {
             let axis = new THREE.Vector3();
             if (part === 'axis-x') axis.set(1, 0, 0);
             if (part === 'axis-y') axis.set(0, 1, 0);
             if (part === 'axis-z') axis.set(0, 0, 1);

             if (light.fixed) axis.applyQuaternion(camera.quaternion);

             // Project axis to screen using the gizmo's visual length for a robust delta.
             // Use getBoundingClientRect for CSS pixel dimensions — must match
             // the coordinate space used for gizmo positioning (SingleLightGizmo.update).
             const gizmoLen = origin.distanceTo(camera.position) * 0.15;
             const axisEnd = origin.clone().addScaledVector(axis, gizmoLen);

             const p1 = origin.clone().project(camera);
             const p2 = axisEnd.clone().project(camera);

             const axisRect = canvasEl.getBoundingClientRect();
             let sx = (p2.x - p1.x) * axisRect.width * 0.5;
             let sy = -(p2.y - p1.y) * axisRect.height * 0.5;

             // If the axis tip is behind the camera, projection mirrors coordinates — negate
             const tipViewZ = axisEnd.applyMatrix4(camera.matrixWorldInverse).z;
             if (tipViewZ > 0) { sx = -sx; sy = -sy; }

             let sVec = new THREE.Vector2(sx, sy);
             if (sVec.lengthSq() < 0.5) sVec.set(1, 0); // Safety for head-on view
             sVec.normalize();

             dragRef.current = {
                 active: true,
                 index,
                 mode: part,
                 startX: e.clientX,
                 startY: e.clientY,
                 startPos: origin.clone(),
                 sceneOffset: capturedOffset,
                 planeNormal: new THREE.Vector3(),
                 planeOrigin: new THREE.Vector3(),
                 offsetFromIntersection: new THREE.Vector3(),
                 screenAxis: sVec,
                 worldAxis: axis
             };
        }

        // Add global listeners for drag operation
        window.addEventListener('pointermove', handlePointerMove as any);
        window.addEventListener('pointerup', handlePointerUp as any);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || !drag.active) return;

        e.preventDefault();
        e.stopPropagation();

        const camera = getViewportCamera();
        if (!camera) return;

        // Get light directly from store to avoid stale closure
        const currentLights = useFractalStore.getState().lighting?.lights || [];
        const light = currentLights[drag.index];
        if (!light) return;

        let newWorldPos = new THREE.Vector3();

        // --- PLANE LOGIC ---
        if (drag.mode.startsWith('plane') || drag.mode === 'free') {
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

        // --- AXIS LOGIC ---
        else {
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;

            // Project mouse delta onto screen axis
            const dist = (dx * drag.screenAxis.x) + (dy * drag.screenAxis.y);

            // Scale sensitivity by distance to keep movement 1:1 visually
            const camDist = drag.startPos.distanceTo(camera.position);

            // Factor: Approx 0.002 world units per pixel at distance 1.
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
        let finalPos = { x: 0, y: 0, z: 0 };

        if (light.fixed) {
            // World -> Local
            const local = newWorldPos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
            finalPos = { x: local.x, y: local.y, z: local.z };
        } else {
            // World -> Unified: use offset captured at drag start for consistency
            const o = drag.sceneOffset;
            finalPos = {
                x: newWorldPos.x + (o.x + o.xL),
                y: newWorldPos.y + (o.y + o.yL),
                z: newWorldPos.z + (o.z + o.zL)
            };
        }

        // Use store directly to avoid stale closure
        useFractalStore.getState().updateLight({
            index: drag.index,
            params: { position: finalPos }
        });
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (!dragRef.current) return;
        setGizmoDragging(false);
        setDraggedLight(null);
        engine.isGizmoInteracting = false;
        handleInteractionEnd();

        dragRef.current = null;

        window.removeEventListener('pointermove', handlePointerMove as any);
        window.removeEventListener('pointerup', handlePointerUp as any);
    };

    if (!showGizmo) return null;

    return (
        <div className="absolute inset-0 pointer-events-none">
            {lights.map((l, i) => (
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

export default LightGizmo;
