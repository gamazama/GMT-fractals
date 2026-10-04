// SinglePositionGizmo — Generic 3D position gizmo (SVG overlay).
//
// Renders an interactive XYZ axis manipulator at a projected screen position.
// Provides axes with arrow markers, constrained plane handles, and a center handle.
// All positioning is done imperatively via the `update()` method for performance.
//
// @invariant `update()` touches the DOM only when a value actually changes. It
//   runs every OVERLAY tick, and an unconditional `setAttribute` — even to the
//   value already there — dirties the SVG, so the compositor repaints and
//   presents every frame for a gizmo that has not moved. On the GMT viewport
//   that was not merely wasted work: sixty presents a second from an overlay
//   sitting on top of the worker's canvas kept the GPU process's main thread
//   blocked in the swap-chain Present, and the fractal — whose WebGL commands
//   are decoded on that same thread — fell from 60 to 14 fps the first time the
//   window lost focus (measured 2026-10-04, `npm run bench:audio`).
//   — proven by: npm run smoke:idle-damage ("a still scene produces no DOM
//   writes from the light gizmo").
//
// Consumer pattern:
//   1. Mount <SinglePositionGizmo ref={gizmoRef} ... /> in a DOM overlay layer.
//   2. In a TICK_PHASE.OVERLAY tick, call gizmoRef.current.update(worldPos, camera, w, h).
//   3. Wire pointer events via onDragStart; the `part` string tells you which handle.

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import {
    projectWorldToScreen,
    getScreenAxisTip,
} from '../../overlay/OverlayProjection';
import type { ScreenPoint } from '../../overlay/OverlayProjection';

// ── Constants ──────────────────────────────────────────────────────

export const GIZMO_SCALE_FACTOR = 0.15;
export const PLANE_SCALE = 0.4;

export const GizmoColors = {
    X:       '#ff4444',
    Y:       '#44ff44',
    Z:       '#4444ff',
    Hover:   '#ffffff',
    PlaneXY: '#4444ff',
    PlaneXZ: '#44ff44',
    PlaneYZ: '#ff4444',
};

// ── Types ──────────────────────────────────────────────────────────

export interface PositionGizmoHandle {
    /** Reposition the gizmo from a world-space point.
     *  @param axisRotation  Optional quaternion — rotates axes for camera-fixed objects. */
    update: (worldPos: THREE.Vector3, camera: THREE.Camera, width: number, height: number, axisRotation?: THREE.Quaternion) => void;
    hide: () => void;
}

export interface SinglePositionGizmoProps {
    /** Unique string — used as SVG marker id suffix; must be unique per mounted instance. */
    id: string;
    /** Center handle fill color. */
    color: string;
    /** Called on pointerdown on any handle.
     *  `part`: 'free' | 'axis-x' | 'axis-y' | 'axis-z' | 'plane-xy' | 'plane-xz' | 'plane-yz'
     *  `origin`: world-space position at drag start (cloned, safe to store). */
    onDragStart: (e: React.PointerEvent, part: string, origin: THREE.Vector3) => void;
    /** Extra DOM content rendered inside the gizmo container (labels, buttons, etc.). */
    children?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────

export const SinglePositionGizmo = React.forwardRef<PositionGizmoHandle, SinglePositionGizmoProps>(
    ({ id, color, onDragStart, children }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const [hoverPart, setHoverPart] = useState<string | null>(null);
        const worldPosRef = useRef(new THREE.Vector3());
        // Last value written per (node, attribute) — the write-on-change guard.
        // Keyed by node so a React re-render that swaps a node starts clean.
        const writtenRef = useRef(new WeakMap<Element, Record<string, string>>());
        // Scratch axes, reused: `update()` runs every frame and must not allocate.
        const axesRef = useRef([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);

        const down = (e: React.PointerEvent, part: string) =>
            onDragStart(e, part, worldPosRef.current.clone());

        React.useImperativeHandle(ref, () => ({
            hide: () => {
                const el = containerRef.current;
                if (el && el.style.display !== 'none') el.style.display = 'none';
            },
            update: (worldPos, camera, width, height, axisRotation) => {
                const el = containerRef.current;
                if (!el) return;

                // Write-on-change. @see the file header @invariant.
                const written = writtenRef.current;
                const setAttr = (node: Element, name: string, value: string) => {
                    let rec = written.get(node);
                    if (!rec) { rec = {}; written.set(node, rec); }
                    if (rec[name] === value) return;
                    rec[name] = value;
                    node.setAttribute(name, value);
                };

                worldPosRef.current.copy(worldPos);
                camera.updateMatrixWorld();

                const screenPos: ScreenPoint | null = projectWorldToScreen(worldPos, camera, width, height);
                if (!screenPos) { if (el.style.display !== 'none') el.style.display = 'none'; return; }

                if (el.style.display !== 'flex') el.style.display = 'flex';
                const transform = `translate3d(${screenPos.x}px,${screenPos.y}px,0)`;
                // Compared against our own last write, not `el.style.transform`:
                // the browser normalises the string, so reading it back never matches.
                let elRec = written.get(el);
                if (!elRec) { elRec = {}; written.set(el, elRec); }
                if (elRec.transform !== transform) { elRec.transform = transform; el.style.transform = transform; }

                const scale = worldPos.distanceTo(camera.position) * GIZMO_SCALE_FACTOR;

                const [ax, ay, az] = axesRef.current;
                ax.set(1, 0, 0); ay.set(0, 1, 0); az.set(0, 0, 1);
                if (axisRotation) { ax.applyQuaternion(axisRotation); ay.applyQuaternion(axisRotation); az.applyQuaternion(axisRotation); }

                const px = getScreenAxisTip(worldPos, ax, scale, camera, screenPos, width, height);
                const py = getScreenAxisTip(worldPos, ay, scale, camera, screenPos, width, height);
                const pz = getScreenAxisTip(worldPos, az, scale, camera, screenPos, width, height);

                const setLine = (cls: string, p: { x: number; y: number } | null) => {
                    el.querySelectorAll(`.${cls}`).forEach(l => {
                        if (p) { setAttr(l, 'x2', String(p.x)); setAttr(l, 'y2', String(p.y)); setAttr(l, 'visibility', 'visible'); }
                        else   { setAttr(l, 'visibility', 'hidden'); }
                    });
                };
                setLine('axis-x-line', px);
                setLine('axis-y-line', py);
                setLine('axis-z-line', pz);

                const setPlane = (cls: string, p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
                    const el2 = el.querySelector(`.${cls}`);
                    if (!el2) return;
                    if (p1 && p2) {
                        const s = PLANE_SCALE;
                        const [x1, y1, x2, y2] = [p1.x * s, p1.y * s, p2.x * s, p2.y * s];
                        setAttr(el2, 'd', `M0,0 L${x1},${y1} L${x1 + x2},${y1 + y2} L${x2},${y2} Z`);
                        setAttr(el2, 'visibility', 'visible');
                    } else {
                        setAttr(el2, 'visibility', 'hidden');
                    }
                };
                setPlane('plane-xy', px, py);
                setPlane('plane-xz', px, pz);
                setPlane('plane-yz', py, pz);
            },
        }));

        const c = GizmoColors;
        const h = hoverPart;

        return (
            <div
                ref={containerRef}
                className="absolute flex items-center justify-center w-0 h-0 pointer-events-auto"
                style={{ display: 'none', willChange: 'transform' }}
            >
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                    <defs>
                        {(['x', 'y', 'z'] as const).map(a => (
                            <marker key={a} id={`arrow-${id}-${a}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L6,3 z" fill={h === `axis-${a}` ? c.Hover : c[a.toUpperCase() as 'X' | 'Y' | 'Z']} />
                            </marker>
                        ))}
                    </defs>

                    {/* Plane handles */}
                    {([['plane-xy', c.PlaneXY], ['plane-xz', c.PlaneXZ], ['plane-yz', c.PlaneYZ]] as const).map(([cls, col]) => (
                        <path key={cls} className={`${cls} cursor-move pointer-events-auto`}
                            fill={h === cls ? c.Hover : col} fillOpacity="0.3" stroke="none"
                            onPointerDown={e => down(e, cls)} onPointerEnter={() => setHoverPart(cls)} onPointerLeave={() => setHoverPart(null)} />
                    ))}

                    {/* Axes — Z, Y, X (back-to-front) */}
                    {(['z', 'y', 'x'] as const).map(a => (
                        <g key={a} onPointerEnter={() => setHoverPart(`axis-${a}`)} onPointerLeave={() => setHoverPart(null)}>
                            <line className={`axis-${a}-line pointer-events-none`} x1="0" y1="0" x2="0" y2="0"
                                stroke={h === `axis-${a}` ? c.Hover : c[a.toUpperCase() as 'X' | 'Y' | 'Z']}
                                strokeWidth="2" markerEnd={`url(#arrow-${id}-${a})`} />
                            <line className={`axis-${a}-line cursor-pointer pointer-events-auto`} x1="0" y1="0" x2="0" y2="0"
                                stroke="transparent" strokeWidth="12" onPointerDown={e => down(e, `axis-${a}`)} />
                        </g>
                    ))}

                    {/* Center handle */}
                    <circle cx="0" cy="0" r="6" fill={color}
                        stroke={h === 'free' ? '#22d3ee' : 'white'} strokeWidth="2"
                        className="cursor-move pointer-events-auto"
                        onPointerDown={e => down(e, 'free')}
                        onPointerEnter={() => setHoverPart('free')} onPointerLeave={() => setHoverPart(null)} />
                </svg>

                {children}
            </div>
        );
    }
);
