
import React, { useRef } from 'react';
import * as THREE from 'three';
import { LightParams } from '../../../types';
import { getProxy } from '../../../engine/worker/WorkerProxy';
const engine = getProxy();
import { useEngineStore } from '../../../../store/engineStore';
import { getViewportCamera, getViewportCanvas, getDisplayCamera } from '../../../engine/worker/ViewportRefs';
import { AnchorIcon, UnanchoredIcon } from '../../../../components/Icons';
import { SinglePositionGizmo } from '../../../../engine/components/gizmo/SinglePositionGizmo';
import type { PositionGizmoHandle } from '../../../../engine/components/gizmo/SinglePositionGizmo';
import {
    getLightWorldPosition,
    projectToScreen,
    activeLightPopup
} from '../utils/GizmoMath';
import { useTutorAnchor } from '../../../../engine/plugins/Tutorial';

interface SingleLightGizmoProps {
    index: number;
    light: LightParams;
    onDragStart: (e: React.PointerEvent, index: number, part: string, origin: THREE.Vector3) => void;
}

export const SingleLightGizmo = React.forwardRef((props: SingleLightGizmoProps, ref: React.Ref<{ update: () => void; hide?: () => void }>) => {
    const { index, light, onDragStart } = props;
    const labelAnchorRef = useTutorAnchor(`light-gizmo-label-${index}`);
    const gizmoAnchorRef = useTutorAnchor(`gizmo-anchor-${index}`);
    const gizmoRef = useRef<PositionGizmoHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateLight = useEngineStore(s => s.updateLight);
    const { handleInteractionStart, handleInteractionEnd } = useEngineStore();
    const isFixed = useEngineStore(s => s.lighting?.lights?.[index]?.fixed ?? light.fixed);

    const toggleAnchor = () => {
        const currentLight = useEngineStore.getState().lighting?.lights?.[index];
        if (!currentLight) return;

        const wasFixed = currentLight.fixed;
        let newPos = currentLight.position;
        const cam = getViewportCamera();
        if (cam) {
            const o = engine.sceneOffset;
            if (wasFixed) {
                const worldPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
                worldPos.applyQuaternion(cam.quaternion);
                worldPos.add(cam.position);
                newPos = { x: worldPos.x + o.x + (o.xL ?? 0), y: worldPos.y + o.y + (o.yL ?? 0), z: worldPos.z + o.z + (o.zL ?? 0) };
            } else {
                const worldPos = new THREE.Vector3(newPos.x - o.x - (o.xL ?? 0), newPos.y - o.y - (o.yL ?? 0), newPos.z - o.z - (o.zL ?? 0));
                worldPos.sub(cam.position);
                worldPos.applyQuaternion(cam.quaternion.clone().invert());
                newPos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
            }
        }
        handleInteractionStart('param');
        updateLight({ index, params: { fixed: !wasFixed, position: newPos } });
        handleInteractionEnd();
    };

    // Expose update/hide to parent orchestrator
    React.useImperativeHandle(ref, () => ({
        hide: () => {
            gizmoRef.current?.hide();
        },
        update: () => {
            const currentLight = useEngineStore.getState().lighting?.lights?.[index] ?? light;

            const camera = getDisplayCamera();
            const canvasEl = getViewportCanvas();
            if (!camera || !canvasEl) return;

            const width = canvasEl.clientWidth;
            const height = canvasEl.clientHeight;
            const sceneOffset = engine.sceneOffset;

            const worldPos = getLightWorldPosition(currentLight, camera, sceneOffset);

            // Pass axis rotation for camera-fixed lights
            const axisRotation = currentLight.fixed ? camera.quaternion : undefined;

            // Delegate to generic gizmo
            gizmoRef.current?.update(worldPos, camera, width, height, axisRotation);

            // --- Range circle visualization (light-specific) ---
            const el = containerRef.current;
            if (!el) return;
            const rangeCircle = el.querySelector('.range-circle') as SVGCircleElement | null;
            if (rangeCircle) {
                const lightRange = currentLight.range ?? 0;
                const popupOpen = activeLightPopup.index === index;
                if (lightRange > 0.001 && popupOpen) {
                    const right = new THREE.Vector3(1, 0, 0).applyMatrix4(camera.matrixWorld).sub(camera.position).normalize();
                    const edgePoint = worldPos.clone().addScaledVector(right, lightRange);
                    const edgeScreen = projectToScreen(edgePoint, camera, width, height);
                    const originScreen = projectToScreen(worldPos, camera, width, height);
                    if (edgeScreen && originScreen) {
                        const dx = edgeScreen.x - originScreen.x;
                        const dy = edgeScreen.y - originScreen.y;
                        const screenRadius = Math.sqrt(dx * dx + dy * dy);
                        rangeCircle.setAttribute('r', String(Math.max(8, screenRadius)));
                        rangeCircle.style.opacity = '0.6';
                    } else {
                        rangeCircle.style.opacity = '0';
                    }
                } else {
                    rangeCircle.style.opacity = '0';
                }
            }
        }
    }));

    const handleGizmoDragStart = (e: React.PointerEvent, part: string, origin: THREE.Vector3) => {
        onDragStart(e, index, part, origin);
    };

    // Directional lights have no position gizmo — return after all hooks
    if (light.type === 'Directional') return null;

    return (
        <div ref={containerRef} className="contents">
            <SinglePositionGizmo
                ref={gizmoRef}
                id={String(index)}
                color={light.color}
                onDragStart={handleGizmoDragStart}
            >
                {/* Range Circle — light-specific (shown during slider interaction) */}
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                    <circle
                        className="range-circle pointer-events-none"
                        cx="0" cy="0" r="0"
                        fill="none" stroke={light.color} strokeWidth="1" strokeDasharray="4 3"
                        style={{ opacity: 0, transition: 'opacity 0.2s ease' }}
                    />
                </svg>

                {/* Label Tag — light-specific */}
                <div ref={labelAnchorRef} className="absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105">
                    <span className="text-[9px] font-bold text-white">L{index + 1}</span>
                    <button
                        ref={gizmoAnchorRef}
                        className="anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); toggleAnchor(); }}
                        title={isFixed ? "Attached to Camera" : "World Anchored"}
                    >
                        {isFixed ? <UnanchoredIcon /> : <AnchorIcon />}
                    </button>
                </div>
            </SinglePositionGizmo>
        </div>
    );
});
