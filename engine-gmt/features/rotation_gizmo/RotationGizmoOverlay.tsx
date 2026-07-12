/**
 * RotationGizmoOverlay — binds canvas RotationGizmo pucks to rotation params.
 *
 * One <RotationGizmo> (the dumb engine-core SVG primitive) per entry in
 * useRotationGizmoStore; entries are toggled from the Vector3Input header icon
 * (FormulaParamsWidget wires it for formula params). This layer owns ALL
 * rotation semantics:
 *
 *  - GIMBAL FRAMES (computeFrames): each Euler ring is drawn in the frame
 *    where editing ITS component is a pure rotation about the pole through the
 *    ring (outermost ring = identity frame, each inner ring picks up the outer
 *    rotations) — so a ring drag reads as turning a wheel on its own axle, and
 *    the dragged ring stays planar-invariant while the others tumble.
 *  - IN-PLANE ring drags: the pointer angle is measured in the RING'S plane
 *    (invert the ring basis's 2×2 screen projection), matching the ringPaths
 *    parameterization so +θ along the drawn ring = +δ on the component. Rings
 *    near edge-on (degenerate projection) fall back to screen-angle mode.
 *  - AXIS-TIP drags use the heliotrope's azimuthal-equidistant mapping
 *    (RotationHeliotrope.tsx): tip distance from the puck centre is LINEAR in
 *    the angle off the view axis — centre = toward viewer, the ring = 90°,
 *    beyond the ring = the BACKSIDE (up to 2R = 180°). Fully invertible, no
 *    hemisphere lock; the tip lands on the cursor everywhere.
 *  - Edits write through the same setter + slotWriteValue path the sliders
 *    use, wrapped in ONE param interaction session (undo = one step per drag;
 *    camera stands down via the `gizmo` interaction source, mirroring
 *    LightGizmo / ADR-0061 P5). Body drags move the puck; × dismisses; a
 *    formula switch closes every gizmo (stale lanes would edit unrelated
 *    params on the new formula).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import { useEngineStore } from '../../../store/engineStore';
import { RotationGizmo, ROT_GIZMO_RADIUS, type RotationGizmoHandle, type RotationGizmoPart } from '../../../engine/components/gizmo/RotationGizmo';
import { getDisplayCamera } from '../../engine/worker/ViewportRefs';
import { useRotationGizmoStore, type RotationGizmoEntry } from '../../store/rotationGizmoStore';
import { INTERACTION_SOURCES } from '../../interaction/interactionSources';
import { slotWriteValue } from '../../utils/uniformSlots';
import type { RotationDescriptor } from '../../../engine/rotationDescriptor';
import { DEG_TO_RAD, sphericalAxis } from '../../utils/rotationMath';

const RAD_TO_DEG = 180 / Math.PI;

// ── Module state for the OVERLAY tick ────────────────────────────────────────

const gizmoRefs: Record<string, RotationGizmoHandle | null> = {};

const _axis = new THREE.Vector3();
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _unitZ = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _mA = new THREE.Matrix4();
const _mB = new THREE.Matrix4();
const _fx = new THREE.Matrix3();
const _fy = new THREE.Matrix3();
const _fz = new THREE.Matrix3();
const FRAMES: readonly [THREE.Matrix3, THREE.Matrix3, THREE.Matrix3] = [_fx, _fy, _fz];

/** Read a param's current vec3 off the engine store ({x,y,z} or THREE). */
function readValue(entry: RotationGizmoEntry): { x: number; y: number; z: number } | null {
    const slice = (useEngineStore.getState() as any)[entry.feature];
    const v = slice?.[entry.paramId];
    if (!v || typeof v.x !== 'number') return null;
    return v;
}

/** Write a param value through the same setter + vec4-held-vec3 contract the
 *  sliders use — undo/animation/uniform flow all ride the normal path. */
function writeValue(entry: RotationGizmoEntry, v: { x: number; y: number; z: number }) {
    const state = useEngineStore.getState() as any;
    const setter = state[`set${entry.feature.charAt(0).toUpperCase()}${entry.feature.slice(1)}`];
    if (!setter) return;
    setter({ [entry.paramId]: slotWriteValue(entry.paramId, entry.paramType ?? 'vec3', v) });
}

/**
 * Gimbal frames for the three rings, per the descriptor's named convention.
 * Convention R = O·M·I (outer·middle·inner, column vectors): the OUTER ring
 * lives in the identity frame, the middle in O, the inner in O·M — then each
 * component edit rotates its ring's grab point along the ring itself.
 */
function computeFrames(rot: RotationDescriptor, v: { x: number; y: number; z: number }) {
    if (rot.kind === 'axis-angle') {
        // Single ring (z) perpendicular to the rotation axis.
        sphericalAxis(v.x, v.y, _axis);
        _q.setFromUnitVectors(_unitZ, _axis);
        _mA.makeRotationFromQuaternion(_q);
        _fz.setFromMatrix4(_mA);
        _fx.identity();
        _fy.identity();
        return;
    }
    const s = rot.units === 'deg' ? DEG_TO_RAD : 1;
    const ax = v.x * s, ay = v.y * s, az = v.z * s;
    if (rot.order === 'mb3d-xyz') {
        // R = Rx·Ry·Rz → x outer, y in Rx, z in Rx·Ry.
        _fx.identity();
        _mA.makeRotationX(ax);
        _fy.setFromMatrix4(_mA);
        _mB.makeRotationY(ay);
        _mA.multiply(_mB);
        _fz.setFromMatrix4(_mA);
    } else if (rot.order === 'gmt-zxy') {
        // R = Rz·Rx·Ry → z outer, x in Rz, y in Rz·Rx.
        _fz.identity();
        _mA.makeRotationZ(az);
        _fx.setFromMatrix4(_mA);
        _mB.makeRotationX(ax);
        _mA.multiply(_mB);
        _fy.setFromMatrix4(_mA);
    } else {
        // seq-xyz (mode:'axes' GLSL order): R = Rz·Ry·Rx → z outer, y in Rz, x in Rz·Ry.
        _fz.identity();
        _mA.makeRotationZ(az);
        _fy.setFromMatrix4(_mA);
        _mB.makeRotationY(ay);
        _mA.multiply(_mB);
        _fx.setFromMatrix4(_mA);
    }
}

/** The (u, v) in-plane basis of ring `comp` — MUST match ringPaths' circle
 *  parameterization (x: u=ŷ v=ẑ, y: u=ẑ v=x̂, z: u=x̂ v=ŷ) so that measured
 *  +θ equals +δ on the component. */
function ringBasis(comp: 'x' | 'y' | 'z') {
    if (comp === 'x') { _u.set(0, 1, 0); _v.set(0, 0, 1); }
    else if (comp === 'y') { _u.set(0, 0, 1); _v.set(1, 0, 0); }
    else { _u.set(1, 0, 0); _v.set(0, 1, 0); }
}

/** Per-frame display update for every open gizmo — TICK_PHASE.OVERLAY. */
export const tick = () => {
    const entries = useRotationGizmoStore.getState().gizmos;
    const cam = getDisplayCamera();
    if (!cam) return;
    for (const [key, entry] of Object.entries(entries)) {
        const handle = gizmoRefs[key];
        if (!handle) continue;
        const v = readValue(entry);
        if (!v) continue; // param not in the active formula right now — leave stale, harmless
        const rot = entry.rotation;
        try {
            computeFrames(rot, v);
            if (rot.kind === 'axis-angle') {
                sphericalAxis(v.x, v.y, _axis);
                handle.update({ cameraQuat: cam.quaternion, frames: FRAMES, axis: _axis, angle: v.z });
            } else if (rot.kind === 'direction') {
                const len = Math.hypot(v.x, v.y, v.z);
                if (len > 1e-6) _axis.set(v.x / len, v.y / len, v.z / len);
                else _axis.set(0, 1, 0);
                handle.update({ cameraQuat: cam.quaternion, frames: FRAMES, axis: _axis });
            } else {
                handle.update({ cameraQuat: cam.quaternion, frames: FRAMES, axis: null });
            }
        } catch (e) {
            console.error('[rotation-gizmo] update failed:', e);
        }
    }
};

// ── Component ────────────────────────────────────────────────────────────────

type DragState = {
    key: string;
    part: RotationGizmoPart;
    startVal: { x: number; y: number; z: number };
    startClient: { x: number; y: number };
    /** Puck centre in CLIENT coords. */
    center: { x: number; y: number };
    /** Ring drags — angle unwrap state (in-plane θ or screen angle). */
    prevAngle: number;
    accum: number;
    /** Ring drags — in-plane basis (frozen at drag start). `planar` false =
     *  ring was near edge-on → screen-angle fallback with `sign`. */
    planar: boolean;
    uS: { x: number; y: number };
    vS: { x: number; y: number };
    det: number;
    sign: number;
    /** Body drags: puck pos at start (viewport-local px). */
    startPos: { x: number; y: number };
    /** direction kind: preserved 3D magnitude. */
    mag3d: number;
};

/** Pointer angle for a ring drag — in the ring's plane when well-conditioned
 *  (invert the 2×2 screen projection of the frozen basis), else screen angle. */
function ringTheta(drag: DragState, clientX: number, clientY: number): number {
    const px = clientX - drag.center.x;
    const py = clientY - drag.center.y;
    if (drag.planar) {
        const a = (drag.vS.y * px - drag.vS.x * py) / drag.det;
        const b = (-drag.uS.y * px + drag.uS.x * py) / drag.det;
        return Math.atan2(b, a);
    }
    return Math.atan2(py, px);
}

export const RotationGizmoOverlay: React.FC<FeatureComponentProps> = () => {
    const gizmos = useRotationGizmoStore((s) => s.gizmos);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);

    // `gizmo` interaction session — camera stands down (selectMovementLock),
    // balanced across pointerup/pointercancel/lostpointercapture/unmount
    // (the LightGizmo pattern, ADR-0061 P5).
    const sessionActive = useRef(false);
    const setSession = (active: boolean) => {
        const s = useEngineStore.getState();
        if (active && !sessionActive.current) { sessionActive.current = true; s.beginInteraction(INTERACTION_SOURCES.gizmo); }
        else if (!active && sessionActive.current) { sessionActive.current = false; s.endInteraction(INTERACTION_SOURCES.gizmo); }
    };
    useEffect(() => () => { if (sessionActive.current) setSession(false); }, []);

    const entriesRef = useRef(gizmos);
    entriesRef.current = gizmos;

    // Formula switch invalidates every open gizmo — the same lane ids mean
    // different things (or nothing) on the new formula, so a stale gizmo would
    // silently edit an unrelated param. Close them all (skip the initial mount).
    const formula = useEngineStore((s) => (s as any).formula);
    const prevFormula = useRef(formula);
    useEffect(() => {
        if (prevFormula.current !== formula) {
            prevFormula.current = formula;
            useRotationGizmoStore.getState().closeAll();
        }
    }, [formula]);

    const handlers = useMemo(() => {
        const onMove = (e: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            e.preventDefault();
            const entry = entriesRef.current[drag.key];
            if (!entry) return;

            if (drag.part === 'body') {
                const dx = e.clientX - drag.startClient.x;
                const dy = e.clientY - drag.startClient.y;
                useRotationGizmoStore.getState().move(drag.key, { x: drag.startPos.x + dx, y: drag.startPos.y + dy });
                return;
            }

            useEngineStore.getState().pokeInteraction(INTERACTION_SOURCES.gizmo);
            const rot = entry.rotation;
            const isDeg = rot.units === 'deg';

            if (drag.part.startsWith('ring-')) {
                // Angle measured in the ring's own plane (frozen drag-start basis),
                // unwrapped so multi-turn drags accumulate — turning the ring like a
                // wheel about the pole through it.
                const a = ringTheta(drag, e.clientX, e.clientY);
                let d = a - drag.prevAngle;
                if (d > Math.PI) d -= Math.PI * 2;
                if (d < -Math.PI) d += Math.PI * 2;
                drag.prevAngle = a;
                drag.accum += d;
                const delta = drag.accum * (drag.planar ? 1 : drag.sign);
                const comp = drag.part.slice(5) as 'x' | 'y' | 'z';
                const next = { ...drag.startVal };
                if (rot.kind === 'axis-angle') {
                    // single ring edits the ANGLE component (z), radians ±2π.
                    next.z = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, drag.startVal.z + delta));
                } else {
                    const step = isDeg ? delta * RAD_TO_DEG : delta;
                    const cap = isDeg ? 360 : Math.PI * 2;
                    next[comp] = Math.max(-cap, Math.min(cap, drag.startVal[comp] + step));
                }
                writeValue(entry, next);
            } else if (drag.part === 'axis-tip') {
                // Heliotrope inversion: pointer distance from the centre is LINEAR in
                // the angle off the view axis (ring radius = 90°); beyond the ring
                // reaches the backside continuously, up to 2R = pointing away.
                const cam = getDisplayCamera();
                if (!cam) return;
                const dx = e.clientX - drag.center.x;
                const dy = e.clientY - drag.center.y;
                const rPx = Math.hypot(dx, dy);
                const phi = Math.min(Math.PI * 0.999, (rPx / ROT_GIZMO_RADIUS) * (Math.PI / 2));
                const sp = Math.sin(phi);
                const nx = rPx > 1e-5 ? (dx / rPx) * sp : 0;
                const ny = rPx > 1e-5 ? (-dy / rPx) * sp : 0;
                _axis.set(nx, ny, Math.cos(phi)).applyQuaternion(cam.quaternion); // view → world
                if (rot.kind === 'direction') {
                    const len = drag.mag3d;
                    writeValue(entry, { x: _axis.x * len, y: _axis.y * len, z: _axis.z * len });
                } else {
                    // axis-angle: x = azimuth, y = pitch (radians). Unwrap azimuth
                    // toward the drag-start value so the ±π atan2 seam doesn't jump
                    // the slider/keyframes by 2π mid-drag.
                    let az = Math.atan2(_axis.x, _axis.z);
                    az += Math.PI * 2 * Math.round((drag.startVal.x - az) / (Math.PI * 2));
                    const pt = Math.asin(Math.max(-1, Math.min(1, _axis.y)));
                    writeValue(entry, { ...drag.startVal, x: az, y: pt });
                }
            }
        };
        const onUp = () => {
            if (!dragRef.current) return;
            const wasParamDrag = dragRef.current.part !== 'body';
            dragRef.current = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('lostpointercapture', onUp);
            if (wasParamDrag) {
                setSession(false);
                useEngineStore.getState().handleInteractionEnd();
            }
        };
        return { onMove, onUp };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onPartDown = (key: string) => (e: React.PointerEvent, part: RotationGizmoPart) => {
        const entry = entriesRef.current[key];
        if (!entry) return;
        if (part === 'dismiss') {
            useRotationGizmoStore.getState().close(key);
            return;
        }
        const v = readValue(entry) ?? { x: 0, y: 0, z: 0 };
        const rect = containerRef.current?.getBoundingClientRect();
        const center = rect
            ? { x: rect.left + entry.pos.x, y: rect.top + entry.pos.y }
            : { x: e.clientX, y: e.clientY };

        // Ring drags: freeze the ring's in-plane screen basis. Near edge-on the
        // 2×2 projection degenerates — fall back to screen-angle with the
        // view-facing sign flip.
        let planar = false;
        const uS = { x: 1, y: 0 };
        const vS = { x: 0, y: 1 };
        let det = 1;
        let sign = 1;
        if (part.startsWith('ring-')) {
            const cam = getDisplayCamera();
            if (cam) {
                const comp = part.slice(5) as 'x' | 'y' | 'z';
                const rot = entry.rotation;
                computeFrames(rot, v);
                const F = comp === 'x' ? _fx : comp === 'y' ? _fy : _fz;
                _q.copy(cam.quaternion).invert();
                ringBasis(comp);
                _u.applyMatrix3(F).applyQuaternion(_q);
                _v.applyMatrix3(F).applyQuaternion(_q);
                uS.x = _u.x; uS.y = -_u.y;
                vS.x = _v.x; vS.y = -_v.y;
                det = uS.x * vS.y - vS.x * uS.y;
                planar = Math.abs(det) > 0.08;
                if (!planar) {
                    // Edge-on: screen-angle mode; the ring normal's view-facing
                    // direction decides the perceived rotation sign.
                    if (rot.kind === 'axis-angle') sphericalAxis(v.x, v.y, _axis);
                    else _axis.set(comp === 'x' ? 1 : 0, comp === 'y' ? 1 : 0, comp === 'z' ? 1 : 0).applyMatrix3(F);
                    _axis.applyQuaternion(_q);
                    sign = _axis.z >= 0 ? -1 : 1; // screen y is down: facing ring reads CW-positive
                }
            }
        }

        // direction kind: preserve the 3D magnitude across an axis-tip re-aim.
        const mag3d = entry.rotation.kind === 'direction' ? (Math.hypot(v.x, v.y, v.z) || 1) : 1;

        dragRef.current = {
            key, part,
            startVal: { x: v.x, y: v.y, z: v.z },
            startClient: { x: e.clientX, y: e.clientY },
            center,
            prevAngle: 0,
            accum: 0,
            planar, uS, vS, det, sign,
            startPos: { ...entry.pos },
            mag3d,
        };
        dragRef.current.prevAngle = ringTheta(dragRef.current, e.clientX, e.clientY);
        (e.target as Element).setPointerCapture(e.pointerId);
        if (part !== 'body') {
            useEngineStore.getState().handleInteractionStart('param');
            setSession(true);
        }
        window.addEventListener('pointermove', handlers.onMove);
        window.addEventListener('pointerup', handlers.onUp);
        window.addEventListener('pointercancel', handlers.onUp);
        window.addEventListener('lostpointercapture', handlers.onUp);
    };

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none">
            {Object.values(gizmos).map((entry) => {
                const kind = entry.rotation.kind;
                const showAxis = kind === 'axis-angle' || kind === 'direction';
                const showRings = kind === 'axis-angle'
                    ? { x: false, y: false, z: true }
                    : kind === 'direction'
                        ? { x: false, y: false, z: false }
                        : { x: true, y: true, z: true };
                return (
                    <RotationGizmo
                        key={entry.key}
                        id={entry.key.replace(/[^a-zA-Z0-9]/g, '-')}
                        label={entry.label}
                        pos={entry.pos}
                        showRings={showRings}
                        showAxis={showAxis}
                        onPartDown={onPartDown(entry.key)}
                        ref={(el) => {
                            if (el) gizmoRefs[entry.key] = el;
                            else delete gizmoRefs[entry.key];
                        }}
                    />
                );
            })}
        </div>
    );
};

export default RotationGizmoOverlay;
