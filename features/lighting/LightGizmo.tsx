
import React, { useRef, useMemo, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { engine } from '../../engine/FractalEngine';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import * as THREE from 'three';
import { SingleLightGizmo } from './components/SingleLightGizmo';

// Global ref to store gizmo refs for orchestrated updates
const globalGizmoRefs = { current: {} as {[key: number]: { update: () => void }} };

// Export tick function for orchestrated updates
export const tick = () => {
    // Update all light gizmos in one loop
    Object.values(globalGizmoRefs.current).forEach(gizmo => {
        try {
            gizmo.update();
        } catch (e) {
            console.error('Error updating light gizmo:', e);
        }
    });
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
        setDraggedLight(index);
        
        (e.target as Element).setPointerCapture(e.pointerId);

        const camera = engine.activeCamera;
        if (!camera || !engine.renderer) return;

        // Raycast Setup
        const rect = engine.renderer.domElement.getBoundingClientRect();
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
            _raycaster.ray.intersectPlane(_plane, intersect);
            
            const offsetFromIntersection = new THREE.Vector3().subVectors(origin, intersect || origin);

            dragRef.current = {
                active: true,
                index,
                mode: part,
                startX: e.clientX,
                startY: e.clientY,
                startPos: origin.clone(),
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
             
             // Project axis to screen to get 2D drag vector
             const p1 = origin.clone().project(camera);
             const p2 = origin.clone().add(axis).project(camera); // Use 1 unit for direction
             
             const sw = engine.renderer.domElement.width / window.devicePixelRatio;
             const sh = engine.renderer.domElement.height / window.devicePixelRatio;
             
             const sx = (p2.x - p1.x) * sw * 0.5;
             const sy = -(p2.y - p1.y) * sh * 0.5; // Flip Y
             
             let sVec = new THREE.Vector2(sx, sy);
             if (sVec.lengthSq() < 1.0) sVec.set(1, 0); // Safety for head-on view
             sVec.normalize();

             dragRef.current = {
                 active: true,
                 index,
                 mode: part,
                 startX: e.clientX,
                 startY: e.clientY,
                 startPos: origin.clone(),
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

        const camera = engine.activeCamera;
        if (!camera) return;

        const light = lights[drag.index];
        if (!light) return;

        let newWorldPos = new THREE.Vector3();

        // --- PLANE LOGIC ---
        if (drag.mode.startsWith('plane') || drag.mode === 'free') {
            const rect = engine.renderer!.domElement.getBoundingClientRect();
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

        // --- CONVERT BACK TO STORE SPACE ---
        let finalPos = { x: 0, y: 0, z: 0 };
        
        if (light.fixed) {
            // World -> Local
            const local = newWorldPos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
            finalPos = { x: local.x, y: local.y, z: local.z };
        } else {
            // World -> Unified (Scene Offset)
            const o = engine.sceneOffset;
            finalPos = { 
                x: newWorldPos.x + (o.x + o.xL), 
                y: newWorldPos.y + (o.y + o.yL), 
                z: newWorldPos.z + (o.z + o.zL) 
            };
        }

        updateLight({ 
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {lights.map((l, i) => (
                <SingleLightGizmo 
                    key={i} 
                    index={i} 
                    light={l}
                    onDragStart={handlePointerDown}
                    ref={(el) => {
                        if (el) {
                            gizmoRefs.current[i] = el;
                        } else {
                            delete gizmoRefs.current[i];
                        }
                    }}
                />
            ))}
        </div>
    );
};

export default LightGizmo;
