
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { LightParams } from '../../../types';
import { getProxy } from '../../../engine/worker/WorkerProxy';
const engine = getProxy();
import { useFractalStore } from '../../../store/fractalStore';
import { getViewportCamera, getViewportCanvas, getDisplayCamera } from '../../../engine/worker/ViewportRefs';
import { AnchorIcon, UnanchoredIcon } from '../../../components/Icons';
import {
    getLightWorldPosition,
    projectToScreen,
    getScreenTip,
    GIZMO_SCALE_FACTOR,
    PLANE_SCALE,
    GizmoColors,
    activeLightPopup
} from '../utils/GizmoMath';

interface SingleLightGizmoProps {
    index: number;
    light: LightParams;
    onDragStart: (e: React.PointerEvent, index: number, part: string, origin: THREE.Vector3) => void;
}

export const SingleLightGizmo = React.forwardRef((props: SingleLightGizmoProps, ref: React.Ref<{ update: () => void }>) => {
    const { index, light, onDragStart } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverState, setHoverState] = useState<{ part: string } | null>(null);
    
    const updateLight = useFractalStore(s => s.updateLight);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    // Subscribe to fixed directly from store — props may lag during drag interactions
    const isFixed = useFractalStore(s => s.lighting?.lights?.[index]?.fixed ?? light.fixed);

    const handleHover = (part: string) => setHoverState({ part });
    const handleUnhover = () => setHoverState(null);

    const toggleAnchor = () => {
        // Read fresh state from store — React props may be stale during rapid interactions
        const currentLight = useFractalStore.getState().lighting?.lights?.[index];
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

    // Expose update/hide methods to parent component
    React.useImperativeHandle(ref, () => ({
        hide: () => {
            if (containerRef.current) containerRef.current.style.display = 'none';
        },
        update: () => {
            // Read fresh light state from store — React props may be stale
            // during timeline scrubbing (store updates synchronously, React re-renders async)
            const currentLight = useFractalStore.getState().lighting?.lights?.[index] ?? light;

            // Use display camera — snapshotted at start of frame in WorkerTickScene
            const camera = getDisplayCamera();
            const canvasEl = getViewportCanvas();
            const el = containerRef.current;

            if (!camera || !canvasEl || !el) {
                return;
            }

            // Use clientWidth/clientHeight (pre-transform layout dimensions) for positioning.
            // The gizmo container lives inside the CSS-scaled parent, so translate3d operates
            // in pre-transform space. getBoundingClientRect would give post-transform visual
            // size, causing positions to be wrong when fitScale < 1.
            const width = canvasEl.clientWidth;
            const height = canvasEl.clientHeight;
            const sceneOffset = engine.sceneOffset;

            // 1. Calculate World Position
            const worldPos = getLightWorldPosition(currentLight, camera, sceneOffset);

            // 2. Project Origin
            const screenPos = projectToScreen(worldPos, camera, width, height);

            if (!screenPos) {
                el.style.display = 'none';
                return;
            }

            // 3. Update Container Position
            el.style.display = 'flex';
            el.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`;

            // 4. Update SVG Axes (Imperative)
            const dist = worldPos.distanceTo(camera.position);
            const scale = dist * GIZMO_SCALE_FACTOR;
            const viewMat = camera.matrixWorldInverse;

            // Axes Vectors
            const axisX = new THREE.Vector3(1, 0, 0);
            const axisY = new THREE.Vector3(0, 1, 0);
            const axisZ = new THREE.Vector3(0, 0, 1);

            if (currentLight.fixed) {
                axisX.applyQuaternion(camera.quaternion);
                axisY.applyQuaternion(camera.quaternion);
                axisZ.applyQuaternion(camera.quaternion);
            }

            const px = getScreenTip(worldPos, axisX, scale, camera, viewMat, screenPos, width, height);
            const py = getScreenTip(worldPos, axisY, scale, camera, viewMat, screenPos, width, height);
            const pz = getScreenTip(worldPos, axisZ, scale, camera, viewMat, screenPos, width, height);

            // Helper to update SVG line attributes
            const updateLine = (cls: string, p: {x:number, y:number} | null) => {
                const lines = el.querySelectorAll(`.${cls}`);
                lines.forEach(line => {
                    if (p) {
                        line.setAttribute('x2', String(p.x));
                        line.setAttribute('y2', String(p.y));
                        line.setAttribute('visibility', 'visible');
                    } else {
                        line.setAttribute('visibility', 'hidden');
                    }
                });
            };
            
            updateLine('axis-x-line', px);
            updateLine('axis-y-line', py);
            updateLine('axis-z-line', pz);

            // Helper to update Planes
            const updatePlane = (cls: string, p1: {x:number, y:number}|null, p2: {x:number, y:number}|null) => {
                const plane = el.querySelector(`.${cls}`);
                if (plane) {
                    if (p1 && p2) {
                        const s = PLANE_SCALE;
                        const x1 = p1.x * s; const y1 = p1.y * s;
                        const x2 = p2.x * s; const y2 = p2.y * s;
                        const x3 = x1 + x2; const y3 = y1 + y2;
                        plane.setAttribute('d', `M0,0 L${x1},${y1} L${x3},${y3} L${x2},${y2} Z`);
                        plane.setAttribute('visibility', 'visible');
                    } else {
                        plane.setAttribute('visibility', 'hidden');
                    }
                }
            };

            updatePlane('plane-xy', px, py);
            updatePlane('plane-xz', px, pz);
            updatePlane('plane-yz', py, pz);

            // --- Range circle visualization ---
            // Shows when range > 0 and the light panel is open
            const rangeCircle = el.querySelector('.range-circle') as SVGCircleElement | null;
            if (rangeCircle) {
                const lightRange = currentLight.range ?? 0;
                const popupOpen = activeLightPopup.index === index;
                if (lightRange > 0.001 && popupOpen) {
                    // Use camera's right vector for a stable screen-space projection
                    // (avoids issues with arbitrary world axes for headlamp lights)
                    const right = new THREE.Vector3(1, 0, 0).applyMatrix4(camera.matrixWorld).sub(camera.position).normalize();
                    const edgePoint = worldPos.clone().addScaledVector(right, lightRange);
                    const edgeScreen = projectToScreen(edgePoint, camera, width, height);
                    if (edgeScreen) {
                        const dx = edgeScreen.x - screenPos.x;
                        const dy = edgeScreen.y - screenPos.y;
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



    const handlePointerDown = (e: React.PointerEvent, part: string) => {
        // Use display camera — matches what update() uses for gizmo positioning
        const camera = getDisplayCamera();
        if (!camera) return;
        // Read fresh from store — props may lag behind store updates
        const currentLight = useFractalStore.getState().lighting?.lights?.[index] ?? light;
        const origin = getLightWorldPosition(currentLight, camera, engine.sceneOffset);
        onDragStart(e, index, part, origin);
    };
    
    // --- CONDITIONAL RETURN ---
    // Directional lights have no position gizmo, but we must return AFTER all hooks
    if (light.type === 'Directional') return null;

    return (
        <div 
            ref={containerRef}
            className="absolute flex items-center justify-center w-0 h-0 pointer-events-auto"
            style={{ display: 'none', willChange: 'transform' }}
        >
            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                <defs>
                    <marker id={`arrow-${index}-x`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-x' ? GizmoColors.Hover : GizmoColors.X} />
                    </marker>
                    <marker id={`arrow-${index}-y`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-y' ? GizmoColors.Hover : GizmoColors.Y} />
                    </marker>
                    <marker id={`arrow-${index}-z`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-z' ? GizmoColors.Hover : GizmoColors.Z} />
                    </marker>
                </defs>

                {/* PLANES */}
                <path 
                    className="plane-xy cursor-move pointer-events-auto transition-opacity duration-150"
                    fill={hoverState?.part === 'plane-xy' ? GizmoColors.Hover : GizmoColors.PlaneXY} 
                    fillOpacity="0.3" stroke="none"
                    onPointerDown={(e) => handlePointerDown(e, 'plane-xy')}
                    onPointerEnter={() => handleHover('plane-xy')}
                    onPointerLeave={handleUnhover}
                />
                <path 
                    className="plane-xz cursor-move pointer-events-auto transition-opacity duration-150"
                    fill={hoverState?.part === 'plane-xz' ? GizmoColors.Hover : GizmoColors.PlaneXZ} 
                    fillOpacity="0.3" stroke="none"
                    onPointerDown={(e) => handlePointerDown(e, 'plane-xz')}
                    onPointerEnter={() => handleHover('plane-xz')}
                    onPointerLeave={handleUnhover}
                />
                <path 
                    className="plane-yz cursor-move pointer-events-auto transition-opacity duration-150"
                    fill={hoverState?.part === 'plane-yz' ? GizmoColors.Hover : GizmoColors.PlaneYZ} 
                    fillOpacity="0.3" stroke="none"
                    onPointerDown={(e) => handlePointerDown(e, 'plane-yz')}
                    onPointerEnter={() => handleHover('plane-yz')}
                    onPointerLeave={handleUnhover}
                />

                {/* AXES */}
                <g onPointerEnter={() => handleHover('axis-z')} onPointerLeave={handleUnhover}>
                        <line className="axis-z-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-z' ? GizmoColors.Hover : GizmoColors.Z} strokeWidth="2" markerEnd={`url(#arrow-${index}-z)`} />
                        <line className="axis-z-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-z')} />
                </g>

                <g onPointerEnter={() => handleHover('axis-y')} onPointerLeave={handleUnhover}>
                        <line className="axis-y-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-y' ? GizmoColors.Hover : GizmoColors.Y} strokeWidth="2" markerEnd={`url(#arrow-${index}-y)`} />
                        <line className="axis-y-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-y')} />
                </g>

                <g onPointerEnter={() => handleHover('axis-x')} onPointerLeave={handleUnhover}>
                        <line className="axis-x-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-x' ? GizmoColors.Hover : GizmoColors.X} strokeWidth="2" markerEnd={`url(#arrow-${index}-x)`} />
                        <line className="axis-x-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-x')} />
                </g>
                
                {/* Range Circle — shown during slider interaction when range > 0 */}
                <circle
                    className="range-circle pointer-events-none"
                    cx="0" cy="0" r="0"
                    fill="none" stroke={light.color} strokeWidth="1" strokeDasharray="4 3"
                    style={{ opacity: 0, transition: 'opacity 0.2s ease' }}
                />

                {/* Center Handle */}
                <circle
                    cx="0" cy="0" r="6"
                    fill={light.color} stroke="white" strokeWidth="2"
                    className={`cursor-move pointer-events-auto transition-all duration-150 ${hoverState?.part === 'free' ? 'stroke-cyan-400 r-[8px]' : ''}`}
                    onPointerDown={(e) => handlePointerDown(e, 'free')}
                    onPointerEnter={() => handleHover('free')}
                    onPointerLeave={handleUnhover}
                />
            </svg>

            {/* Label Tag */}
            <div className="absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105">
                <span className="text-[9px] font-bold text-white">L{index+1}</span>
                <button
                    className="anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); toggleAnchor(); }}
                    title={isFixed ? "Attached to Camera" : "World Anchored"}
                >
                    {isFixed ? <UnanchoredIcon /> : <AnchorIcon />}
                </button>
            </div>
        </div>
    );
});
