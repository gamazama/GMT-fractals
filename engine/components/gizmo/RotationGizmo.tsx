// RotationGizmo — Generic screen-anchored 3D rotation gizmo (SVG overlay).
//
// A draggable "puck" pinned to a SCREEN position (not a world projection —
// rotation params have no world anchor) that renders a miniature 3D view of a
// rotation: per-axis rings, an optional rotation-axis arrow with an angle arc,
// and a label chip + dismiss button. Multiple instances coexist — each is
// fully self-contained.
//
// Rings take PER-RING frames (gimbal convention): each ring is drawn in the
// frame where editing ITS component is a pure rotation about the pole through
// it — the dragged ring stays planar-invariant while the others tumble
// (Blender "Gimbal" behavior). The caller computes the frames per Euler order.
//
// The AXIS ARROW uses the heliotrope's azimuthal-equidistant mapping (see
// components/vector-input/RotationHeliotrope.tsx): tip at centre = axis toward
// the viewer, tip ON the ring = 90° (screen plane), tip BEYOND the ring =
// pointing away (up to 2R = 180°) — so the whole sphere is reachable in one
// drag, with the heliotrope's pseudo-3D cues: cyan front / red back, dashed
// stem, and a head that grows toward the viewer and squashes away.
//
// Dumb by design: it renders geometry and reports pointer-downs with a `part`
// id; ALL rotation semantics (what a ring drag means, units, composition) live
// in the caller (see engine-gmt RotationGizmoOverlay).
//
// Consumer pattern (mirrors SinglePositionGizmo):
//   1. Mount <RotationGizmo ref={r} ... /> in a DOM overlay layer.
//   2. In a TICK_PHASE.OVERLAY tick, call r.current.update({ cameraQuat,
//      frames, axis?, angle? }) every frame.
//   3. Wire pointer events via onPartDown; parts: 'ring-x'|'ring-y'|'ring-z'|
//      'axis-tip'|'body'|'dismiss'.

import React, { useRef, useState } from 'react';
import * as THREE from 'three';

export const ROT_GIZMO_RADIUS = 56;           // ring radius px; ALSO the 90° arrow boundary
const RING_SEGMENTS = 48;
/** Mild depth foreshortening on ring points (view z ∈ [-1,1] → scale
 *  ~0.82..1.28). Pure orthographic reads as a Necker cube — the front/back
 *  ambiguity makes rings "flip" optically. Two-tone (front vs back path)
 *  plus this perspective cue disambiguates. */
const PERSPECTIVE = 0.22;

export const RotGizmoColors = {
    X: '#ff4444',
    Y: '#44ff44',
    Z: '#4444ff',
    Axis: '#22d3ee',
    AxisBack: '#ef4444',
    Hover: '#ffffff',
};

export interface RotationGizmoUpdate {
    /** Display-camera world quaternion — orients the mini 3D view. */
    cameraQuat: THREE.Quaternion;
    /** Per-ring gimbal frames (x, y, z rings). Identity = world axes. */
    frames: readonly [THREE.Matrix3, THREE.Matrix3, THREE.Matrix3];
    /** Rotation-axis arrow (axis-angle / direction kinds), WORLD-space unit vector. */
    axis?: THREE.Vector3 | null;
    /** Angle (radians) drawn as an arc outside the ring. */
    angle?: number;
}

export interface RotationGizmoHandle {
    update: (u: RotationGizmoUpdate) => void;
    /** Puck centre in viewport-local px — callers use it for ring-drag angle math. */
    getCenter: () => { x: number; y: number };
}

export type RotationGizmoPart = 'ring-x' | 'ring-y' | 'ring-z' | 'axis-tip' | 'body' | 'dismiss';

export interface RotationGizmoProps {
    /** Unique per mounted instance. */
    id: string;
    label: string;
    /** Puck centre position in viewport-local px. */
    pos: { x: number; y: number };
    /** Hide rings the caller's kind doesn't edit ('axis-angle' shows one ring + arrow). */
    showRings?: { x: boolean; y: boolean; z: boolean };
    showAxis?: boolean;
    onPartDown: (e: React.PointerEvent, part: RotationGizmoPart) => void;
    children?: React.ReactNode;
}

// Module-level scratch — gizmo updates run per frame on the OVERLAY tick.
const _p = new THREE.Vector3();
const _camInv = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _arcH = new THREE.Vector3();
const _arcX = new THREE.Vector3();
const _arcY = new THREE.Vector3();

/** Project a point through a ring frame + camera into puck px.
 *  view.x → +x, view.y → −y (screen-down), with mild perspective (points
 *  toward the viewer, z > 0, render larger). Returns depth for front/back
 *  splitting. */
function project(
    p: THREE.Vector3, frame: THREE.Matrix3, camInv: THREE.Quaternion, r: number,
): { x: number; y: number; z: number } {
    _p.copy(p).applyMatrix3(frame).applyQuaternion(camInv);
    const s = 1 / (1 - _p.z * PERSPECTIVE);
    return { x: _p.x * r * s, y: -_p.y * r * s, z: _p.z };
}

/** SVG paths for a unit great circle perpendicular to `axisIdx` in `frame`,
 *  split into a FRONT arc (z ≥ 0, toward the viewer — drawn bold) and a BACK
 *  arc (dim), plus the full circle for the hit stroke.
 *  @invariant The parameterization (u, v per axis) is the drag contract:
 *  RotationGizmoOverlay measures pointer angles in the SAME basis
 *  (x-ring: u=ŷ v=ẑ, y-ring: u=ẑ v=x̂, z-ring: u=x̂ v=ŷ), which makes
 *  +θ along the drawn ring equal +δ on the edited component. */
function ringPaths(
    axisIdx: 0 | 1 | 2, frame: THREE.Matrix3, camInv: THREE.Quaternion, r: number,
): { front: string; back: string; full: string } {
    let front = '', back = '', full = '';
    let prevFront: boolean | null = null;
    for (let s = 0; s <= RING_SEGMENTS; s++) {
        const t = (s / RING_SEGMENTS) * Math.PI * 2;
        const c = Math.cos(t), sn = Math.sin(t);
        if (axisIdx === 0) _p.set(0, c, sn);
        else if (axisIdx === 1) _p.set(sn, 0, c);
        else _p.set(c, sn, 0);
        const q = project(_p, frame, camInv, r);
        const pt = q.x.toFixed(1) + ',' + q.y.toFixed(1);
        full += (s === 0 ? 'M' : 'L') + pt;
        const isFront = q.z >= 0;
        if (isFront) front += (prevFront === true ? 'L' : 'M') + pt;
        else back += (prevFront === false ? 'L' : 'M') + pt;
        prevFront = isFront;
    }
    return { front, back, full };
}

export const RotationGizmo = React.forwardRef<RotationGizmoHandle, RotationGizmoProps>(
    ({ id, label, pos, showRings = { x: true, y: true, z: true }, showAxis = false, onPartDown, children }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const [hoverPart, setHoverPart] = useState<string | null>(null);
        const posRef = useRef(pos);
        posRef.current = pos;

        React.useImperativeHandle(ref, () => ({
            getCenter: () => ({ x: posRef.current.x, y: posRef.current.y }),
            update: ({ cameraQuat, frames, axis, angle = 0 }) => {
                const el = containerRef.current;
                if (!el) return;
                _camInv.copy(cameraQuat).invert();
                const r = ROT_GIZMO_RADIUS;

                (['x', 'y', 'z'] as const).forEach((a, i) => {
                    const paths = ringPaths(i as 0 | 1 | 2, frames[i], _camInv, r);
                    const set = (suffix: string, d: string) => {
                        el.querySelector(`.rg-ring-${a}-${suffix}`)?.setAttribute('d', d);
                    };
                    set('front', paths.front);
                    set('back', paths.back);
                    set('hit', paths.full);
                });

                const line = el.querySelector('.rg-axis-line') as SVGLineElement | null;
                const head = el.querySelector('.rg-axis-head') as SVGPolygonElement | null;
                const hitLine = el.querySelector('.rg-axis-hit') as SVGLineElement | null;
                const tipHit = el.querySelector('.rg-axis-tip-hit') as SVGCircleElement | null;
                const arc = el.querySelector('.rg-angle-arc') as SVGPathElement | null;
                if (axis && (line || head)) {
                    // Azimuthal-equidistant tip (the heliotrope mapping): distance from
                    // centre is LINEAR in the angle off the view axis — centre = toward
                    // viewer, ring = 90°, 2R = pointing away. Fully invertible, so the
                    // overlay's drag lands the tip exactly on the cursor, backside included.
                    _ax.copy(axis).normalize().applyQuaternion(_camInv);
                    const z = Math.max(-1, Math.min(1, _ax.z));
                    const phi = Math.acos(z);
                    const rTip = (phi / (Math.PI / 2)) * r;
                    const p2 = Math.hypot(_ax.x, _ax.y);
                    const dxn = p2 > 1e-5 ? _ax.x / p2 : 0;
                    const dyn = p2 > 1e-5 ? -_ax.y / p2 : 0;
                    const tx = dxn * rTip, ty = dyn * rTip;
                    const isBack = z < 0;
                    // Heliotrope pseudo-3D head: grows pointing at the viewer (1.5× at
                    // centre), normal at 90°, squashes toward nothing pointing away.
                    const headScale = z >= 0 ? 1 + z * 0.5 : Math.max(0.05, 1 + z * 0.95);
                    el.style.setProperty('--rg-axis-color', isBack ? RotGizmoColors.AxisBack : RotGizmoColors.Axis);
                    const rot = Math.atan2(ty, tx) * (180 / Math.PI) + 90;
                    if (line) {
                        line.setAttribute('x2', tx.toFixed(1));
                        line.setAttribute('y2', ty.toFixed(1));
                        line.setAttribute('opacity', String(0.35 + Math.min(rTip / r, 1) * 0.45));
                        line.setAttribute('visibility', 'visible');
                    }
                    if (head) {
                        head.setAttribute('transform',
                            `translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${Math.max(0.9, 0.9 + headScale * 0.1).toFixed(2)},${Math.max(0.05, headScale).toFixed(2)})`);
                        head.setAttribute('opacity', String(Math.max(0.15, 0.6 + (headScale - 1) * 0.4)));
                        head.setAttribute('visibility', 'visible');
                    }
                    if (hitLine) {
                        hitLine.setAttribute('x2', tx.toFixed(1));
                        hitLine.setAttribute('y2', ty.toFixed(1));
                        hitLine.setAttribute('visibility', 'visible');
                    }
                    if (tipHit) {
                        tipHit.setAttribute('cx', tx.toFixed(1));
                        tipHit.setAttribute('cy', ty.toFixed(1));
                        tipHit.setAttribute('visibility', 'visible');
                    }
                    if (arc) {
                        // Angle readout: arc sweep proportional to |angle| (capped 2π),
                        // drawn OUTSIDE the ring so it reads as a protractor scale.
                        const sweep = Math.min(Math.abs(angle), Math.PI * 2);
                        const ar = r * 1.18;
                        if (sweep > 0.02) {
                            _arcH.set(Math.abs(_ax.x) < 0.9 ? 1 : 0, Math.abs(_ax.x) < 0.9 ? 0 : 1, 0);
                            _arcX.crossVectors(_arcH, _ax).normalize();
                            _arcY.crossVectors(_ax, _arcX);
                            let d = '';
                            const steps = 24;
                            for (let s = 0; s <= steps; s++) {
                                const t = (s / steps) * sweep * Math.sign(angle || 1);
                                const ct = Math.cos(t), st = Math.sin(t);
                                const px = (_arcX.x * ct + _arcY.x * st) * ar;
                                const py = -(_arcX.y * ct + _arcY.y * st) * ar;
                                d += (s === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
                            }
                            arc.setAttribute('d', d);
                            arc.setAttribute('visibility', 'visible');
                        } else {
                            arc.setAttribute('visibility', 'hidden');
                        }
                    }
                } else {
                    for (const e2 of [line, head, hitLine, tipHit, arc]) e2?.setAttribute('visibility', 'hidden');
                }
            },
        }));

        const c = RotGizmoColors;
        const h = hoverPart;
        const down = (e: React.PointerEvent, part: RotationGizmoPart) => {
            e.preventDefault();
            e.stopPropagation();
            onPartDown(e, part);
        };
        const R = ROT_GIZMO_RADIUS;

        return (
            <div
                ref={containerRef}
                className="absolute pointer-events-none"
                style={{
                    transform: `translate3d(${pos.x}px,${pos.y}px,0)`, willChange: 'transform',
                    width: 0, height: 0,
                    ['--rg-axis-color' as any]: c.Axis,
                }}
            >
                {/* Body / backdrop: drag to move the puck */}
                <div
                    className="absolute rounded-full pointer-events-auto cursor-grab"
                    style={{
                        left: -R - 14, top: -R - 14, width: (R + 14) * 2, height: (R + 14) * 2,
                        background: 'radial-gradient(circle, rgba(10,12,18,0.28) 55%, rgba(10,12,18,0.05) 78%, transparent 100%)',
                        border: '1px solid rgba(148,163,184,0.15)',
                    }}
                    onPointerDown={(e) => down(e, 'body')}
                />
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }} width="0" height="0">
                    {/* Angle arc (axis-angle kinds) — outside the ring, follows axis color */}
                    <path className="rg-angle-arc" visibility="hidden" fill="none" stroke="var(--rg-axis-color)" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="3 3" />

                    {/* Axis rings — dim back arc + bold front arc (the depth cue) +
                        wide invisible full-circle hit stroke */}
                    {(['x', 'y', 'z'] as const).map((a) => showRings[a] && (
                        <g key={a} onPointerEnter={() => setHoverPart(`ring-${a}`)} onPointerLeave={() => setHoverPart(null)}>
                            <path className={`rg-ring-${a}-back`} fill="none"
                                stroke={c[a.toUpperCase() as 'X' | 'Y' | 'Z']}
                                strokeWidth="1.2" strokeOpacity="0.25" />
                            <path className={`rg-ring-${a}-front`} fill="none"
                                stroke={h === `ring-${a}` ? c.Hover : c[a.toUpperCase() as 'X' | 'Y' | 'Z']}
                                strokeWidth={h === `ring-${a}` ? 2.6 : 1.8} strokeOpacity="0.95" />
                            <path className={`rg-ring-${a}-hit pointer-events-auto cursor-crosshair`} fill="none"
                                stroke="transparent" strokeWidth="11"
                                onPointerDown={(e) => down(e, `ring-${a}` as RotationGizmoPart)} />
                        </g>
                    ))}

                    {/* Rotation-axis arrow — heliotrope-style: dashed stem + depth-scaled
                        polygon head; cyan pointing forward, red pointing back */}
                    {showAxis && (
                        <g onPointerEnter={() => setHoverPart('axis-tip')} onPointerLeave={() => setHoverPart(null)}>
                            <line className="rg-axis-line" x1="0" y1="0" x2="0" y2="0" visibility="hidden"
                                stroke={h === 'axis-tip' ? c.Hover : 'var(--rg-axis-color)'}
                                strokeWidth="2" strokeDasharray="4 2" />
                            <polygon className="rg-axis-head" points="0,-8 -6,4 6,4" visibility="hidden"
                                fill={h === 'axis-tip' ? c.Hover : 'var(--rg-axis-color)'} />
                            <line className="rg-axis-hit pointer-events-auto cursor-pointer" x1="0" y1="0" x2="0" y2="0" visibility="hidden"
                                stroke="transparent" strokeWidth="14"
                                onPointerDown={(e) => down(e, 'axis-tip')} />
                            <circle className="rg-axis-tip-hit pointer-events-auto cursor-pointer" cx="0" cy="0" r="11" visibility="hidden"
                                fill="transparent"
                                onPointerDown={(e) => down(e, 'axis-tip')} />
                        </g>
                    )}

                    {/* Centre dot */}
                    <circle cx="0" cy="0" r="2.5" fill="rgba(226,232,240,0.8)" />
                </svg>

                {/* Label chip + dismiss */}
                <div
                    className="absolute flex items-center gap-1 pointer-events-auto select-none"
                    style={{ left: -R, top: R + 18, width: R * 2, justifyContent: 'center' }}
                >
                    <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono cursor-grab whitespace-nowrap"
                        style={{ background: 'rgba(10,12,18,0.7)', color: 'rgba(203,213,225,0.9)', border: '1px solid rgba(148,163,184,0.25)' }}
                        onPointerDown={(e) => down(e, 'body')}
                    >
                        {label}
                    </span>
                    <button
                        className="w-4 h-4 rounded-full text-[9px] leading-none flex items-center justify-center"
                        style={{ background: 'rgba(10,12,18,0.7)', color: 'rgba(203,213,225,0.75)', border: '1px solid rgba(148,163,184,0.25)' }}
                        onPointerDown={(e) => down(e, 'dismiss')}
                        title="Dismiss gizmo"
                    >
                        ×
                    </button>
                </div>

                {children}
            </div>
        );
    }
);

export default RotationGizmo;
