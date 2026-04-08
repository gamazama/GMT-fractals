// SinglePositionGizmo.tsx — Generic 3D position gizmo (SVG overlay)
//
// Renders an interactive XYZ axis manipulator at a projected screen position.
// Provides axes with arrow markers, constrained plane handles, and a center handle.
// All positioning is done imperatively via the `update()` method for performance.
//
// This is the shared base consumed by LightGizmo and any future position gizmos.

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import {
    projectWorldToScreen,
    getScreenAxisTip,
} from '../../engine/overlay/OverlayProjection';
import type { ScreenPoint } from '../../engine/overlay/OverlayProjection';

// ── Constants ──────────────────────────────────────────────────────

export const GIZMO_SCALE_FACTOR = 0.15;
export const PLANE_SCALE = 0.4;

export const GizmoColors = {
    X: '#ff4444',
    Y: '#44ff44',
    Z: '#4444ff',
    Hover: '#ffffff',
    PlaneXY: '#4444ff',
    PlaneXZ: '#44ff44',
    PlaneYZ: '#ff4444',
};

// ── Types ──────────────────────────────────────────────────────────

export interface PositionGizmoHandle {
    /** Update the gizmo's screen position from a world-space position.
     *  @param worldPos   World-space position of the gizmo
     *  @param camera     Three.js camera (must have updated matrixWorld)
     *  @param width      Viewport width (clientWidth)
     *  @param height     Viewport height (clientHeight)
     *  @param axisRotation  Optional quaternion to rotate axes (for camera-fixed gizmos)
     */
    update: (worldPos: THREE.Vector3, camera: THREE.Camera, width: number, height: number, axisRotation?: THREE.Quaternion) => void;
    /** Hide the gizmo container */
    hide: () => void;
}

export interface SinglePositionGizmoProps {
    /** Unique ID for SVG marker defs (avoid collisions when multiple gizmos exist) */
    id: string;
    /** Center handle fill color */
    color: string;
    /** Callback when a drag starts on any gizmo part.
     *  `part` is one of: 'free', 'axis-x', 'axis-y', 'axis-z', 'plane-xy', 'plane-xz', 'plane-yz'
     *  `origin` is the world-space position at drag start */
    onDragStart: (e: React.PointerEvent, part: string, origin: THREE.Vector3) => void;
    /** Extra content rendered inside the gizmo container (label tags, range circles, etc.) */
    children?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────

export const SinglePositionGizmo = React.forwardRef<PositionGizmoHandle, SinglePositionGizmoProps>(
    (props, ref) => {
        const { id, color, onDragStart, children } = props;
        const containerRef = useRef<HTMLDivElement>(null);
        const [hoverState, setHoverState] = useState<{ part: string } | null>(null);

        // Track world position for drag start callback
        const worldPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

        const handleHover = (part: string) => setHoverState({ part });
        const handleUnhover = () => setHoverState(null);

        const handlePointerDown = (e: React.PointerEvent, part: string) => {
            onDragStart(e, part, worldPosRef.current.clone());
        };

        // Expose imperative update/hide
        React.useImperativeHandle(ref, () => ({
            hide: () => {
                if (containerRef.current) containerRef.current.style.display = 'none';
            },
            update: (worldPos: THREE.Vector3, camera: THREE.Camera, width: number, height: number, axisRotation?: THREE.Quaternion) => {
                const el = containerRef.current;
                if (!el) return;

                worldPosRef.current.copy(worldPos);

                // Project origin to screen
                camera.updateMatrixWorld();
                const screenPos = projectWorldToScreen(worldPos, camera, width, height);
                if (!screenPos) {
                    el.style.display = 'none';
                    return;
                }

                el.style.display = 'flex';
                el.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`;

                // Calculate axis scale based on distance
                const dist = worldPos.distanceTo(camera.position);
                const scale = dist * GIZMO_SCALE_FACTOR;

                // Axis directions (optionally rotated)
                const axisX = new THREE.Vector3(1, 0, 0);
                const axisY = new THREE.Vector3(0, 1, 0);
                const axisZ = new THREE.Vector3(0, 0, 1);

                if (axisRotation) {
                    axisX.applyQuaternion(axisRotation);
                    axisY.applyQuaternion(axisRotation);
                    axisZ.applyQuaternion(axisRotation);
                }

                const px = getScreenAxisTip(worldPos, axisX, scale, camera, screenPos, width, height);
                const py = getScreenAxisTip(worldPos, axisY, scale, camera, screenPos, width, height);
                const pz = getScreenAxisTip(worldPos, axisZ, scale, camera, screenPos, width, height);

                // Update axis lines imperatively
                const updateLine = (cls: string, p: { x: number; y: number } | null) => {
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

                // Update plane handles
                const updatePlane = (cls: string, p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
                    const plane = el.querySelector(`.${cls}`);
                    if (plane) {
                        if (p1 && p2) {
                            const s = PLANE_SCALE;
                            const x1 = p1.x * s, y1 = p1.y * s;
                            const x2 = p2.x * s, y2 = p2.y * s;
                            const x3 = x1 + x2, y3 = y1 + y2;
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
            },
        }));

        return (
            <div
                ref={containerRef}
                className="absolute flex items-center justify-center w-0 h-0 pointer-events-auto"
                style={{ display: 'none', willChange: 'transform' }}
            >
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                    <defs>
                        <marker id={`arrow-${id}-x`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-x' ? GizmoColors.Hover : GizmoColors.X} />
                        </marker>
                        <marker id={`arrow-${id}-y`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-y' ? GizmoColors.Hover : GizmoColors.Y} />
                        </marker>
                        <marker id={`arrow-${id}-z`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L6,3 z" fill={hoverState?.part === 'axis-z' ? GizmoColors.Hover : GizmoColors.Z} />
                        </marker>
                    </defs>

                    {/* Plane handles */}
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

                    {/* Axes (Z, Y, X — back-to-front for visual order) */}
                    <g onPointerEnter={() => handleHover('axis-z')} onPointerLeave={handleUnhover}>
                        <line className="axis-z-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-z' ? GizmoColors.Hover : GizmoColors.Z} strokeWidth="2" markerEnd={`url(#arrow-${id}-z)`} />
                        <line className="axis-z-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-z')} />
                    </g>

                    <g onPointerEnter={() => handleHover('axis-y')} onPointerLeave={handleUnhover}>
                        <line className="axis-y-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-y' ? GizmoColors.Hover : GizmoColors.Y} strokeWidth="2" markerEnd={`url(#arrow-${id}-y)`} />
                        <line className="axis-y-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-y')} />
                    </g>

                    <g onPointerEnter={() => handleHover('axis-x')} onPointerLeave={handleUnhover}>
                        <line className="axis-x-line pointer-events-none transition-all duration-150" x1="0" y1="0" x2="0" y2="0" stroke={hoverState?.part === 'axis-x' ? GizmoColors.Hover : GizmoColors.X} strokeWidth="2" markerEnd={`url(#arrow-${id}-x)`} />
                        <line className="axis-x-line cursor-pointer pointer-events-auto" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0,0,0,0)" strokeWidth="12" onPointerDown={(e) => handlePointerDown(e, 'axis-x')} />
                    </g>

                    {/* Center Handle */}
                    <circle
                        cx="0" cy="0" r="6"
                        fill={color} stroke="white" strokeWidth="2"
                        className={`cursor-move pointer-events-auto transition-all duration-150 ${hoverState?.part === 'free' ? 'stroke-cyan-400 r-[8px]' : ''}`}
                        onPointerDown={(e) => handlePointerDown(e, 'free')}
                        onPointerEnter={() => handleHover('free')}
                        onPointerLeave={handleUnhover}
                    />
                </svg>

                {/* Extra content (labels, buttons, etc.) — provided by consumer */}
                {children}
            </div>
        );
    }
);
