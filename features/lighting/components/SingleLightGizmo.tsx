
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { LightParams } from '../../../types';
import { engine } from '../../../engine/FractalEngine';
import { useFractalStore } from '../../../store/fractalStore';
import { LightSettingsPopup } from './LightControls';
import { AnchorIcon, UnanchoredIcon } from '../../../components/Icons';
import { 
    getLightWorldPosition, 
    projectToScreen, 
    getScreenTip, 
    GIZMO_SCALE_FACTOR, 
    PLANE_SCALE, 
    GizmoColors 
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
    const [menuOpen, setMenuOpen] = useState(false);
    
    const updateLight = useFractalStore(s => s.updateLight);
    
    const handleHover = (part: string) => setHoverState({ part });
    const handleUnhover = () => setHoverState(null);

    const toggleAnchor = () => {
        if (!engine.activeCamera) return;
        const wasFixed = light.fixed;
        const newPos = engine.virtualSpace.resolveRealWorldPosition(light.position, wasFixed, engine.activeCamera);
        updateLight({ index, params: { fixed: !wasFixed, position: newPos } });
    };

    // Expose update method to parent component
    React.useImperativeHandle(ref, () => ({
        update: () => {
            // Optimization: Don't update if directional (no gizmo) or not visible
            if (light.type === 'Directional' || !light.visible) {
                if (containerRef.current) {
                    containerRef.current.style.display = 'none';
                }
                return;
            }

            const camera = engine.activeCamera;
            const renderer = engine.renderer;
            const el = containerRef.current;
            
            if (!camera || !renderer || !el) {
                return;
            }

            // Use getBoundingClientRect for accurate CSS dimensions on all devices
            // This fixes mobile offset issues where internal resolution may differ from CSS size
            const rect = renderer.domElement.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const sceneOffset = engine.sceneOffset;

            // 1. Calculate World Position
            const worldPos = getLightWorldPosition(light, camera, sceneOffset);

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

            if (light.fixed) {
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
        }
    }));



    const handlePointerDown = (e: React.PointerEvent, part: string) => {
        const camera = engine.activeCamera;
        if (!camera) return;
        const origin = getLightWorldPosition(light, camera, engine.sceneOffset);
        onDragStart(e, index, part, origin);
    };
    
    const handleLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
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
            <div className="absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105" onClick={handleLabelClick}>
                <span className="text-[9px] font-bold text-white uppercase">L{index+1}</span>
                <button 
                    className="anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]"
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); toggleAnchor(); }}
                    title={light.fixed ? "Attached to Camera" : "World Anchored"}
                >
                    {light.fixed ? <UnanchoredIcon /> : <AnchorIcon />}
                </button>
            </div>

            {/* Settings Menu Popup */}
            {menuOpen && (
                    <div 
                    className="absolute left-6 top-10 ml-2 pointer-events-auto z-[100]" 
                    onPointerDown={(e) => e.stopPropagation()}
                >
                        <div className="bg-black/90 border border-white/20 rounded-xl p-2 w-56 shadow-2xl relative">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 bg-black border-l border-b border-white/20 transform rotate-45" />
                            <LightSettingsPopup index={index} />
                        </div>
                    </div>
            )}
            
            {/* Click outside listener for menu */}
            {menuOpen && (
                <div 
                    className="fixed inset-0 z-50" 
                    onClick={() => setMenuOpen(false)}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            )}
        </div>
    );
});
