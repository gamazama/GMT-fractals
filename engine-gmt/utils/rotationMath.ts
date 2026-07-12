/**
 * rotationMath — THE single CPU-side source for turning stored rotation params
 * into shader-ready data (matrices, sin/cos pairs, axis+angle).
 *
 * Rotations are converted HERE, on the CPU, and the shader receives finished
 * values (mat3 elements, sin/cos, axis vectors) — never raw UI-facing angle
 * encodings it has to convert per-sample. Consumers: UniformManager's derived
 * rotation sync, the MB3D const packer / live binder (utils/mb3d/constPacker.ts),
 * the canvas rotation gizmo, and the vector-input widgets.
 *
 * @invariant Each function mirrors ONE authority implementation VERBATIM and is
 * named for its convention (see engine/rotationDescriptor.ts EulerOrder). They
 * are NOT interchangeable:
 *  - mb3dEulerToMat3    ≡ MB3D BuildRotMatrix (Math3D.pas:2478), R = Rx·Ry·Rz,
 *                         row-major out — byte-compatible with the const-buffer
 *                         layout the x87 decompiler emits (Cm offsets).
 *  - mb3dSixPlaneToMat4 ≡ MB3D BuildRotMatrix4d (Math3D.pas:2548), six plane
 *                         rotations LEFT-multiplied, row-major 16.
 *  - gmtEulerZxyToMat3  ≡ UniformManager.buildRotMatrix, R = Z·X·Y
 *                         (column-vector THREE convention).
 *  - rodriguesSpherical ≡ gmt_precalcRodrigues (features/geometry/transforms.ts)
 *                         INCLUDING the 0.001 dead-zone and the HALF-angle
 *                         (sin/cos of angle·0.5) — the GLSL applies Rodrigues
 *                         with these directly, so the half-angle is part of the
 *                         wire contract, not a bug.
 * If one of the authorities changes, change the mirror in the same commit.
 */

import * as THREE from 'three';

/** Degrees → radians (MB3D PID180). */
export const DEG_TO_RAD = Math.PI / 180;

// ── MB3D conventions ─────────────────────────────────────────────────────────

/** Euler XYZ (radians) → row-major 3×3 (M[0,0]..M[2,2]), R = Rx·Ry·Rz.
 *  Mirrors MB3D BuildRotMatrix (Math3D.pas:2478). */
export function mb3dEulerToMat3(xa: number, ya: number, za: number): number[] {
    const sinX = Math.sin(xa), cosX = Math.cos(xa);
    const sinY = Math.sin(ya), cosY = Math.cos(ya);
    const sinZ = Math.sin(za), cosZ = Math.cos(za);
    return [
        cosY * cosZ, -cosY * sinZ, sinY,
        sinX * sinY * cosZ + cosX * sinZ, cosX * cosZ - sinX * sinY * sinZ, -sinX * cosY,
        sinX * sinZ - cosX * sinY * cosZ, cosX * sinY * sinZ + sinX * cosZ, cosX * cosY,
    ];
}

/** 6 plane-rotation angles (radians) → flat row-major 4×4 (16 elements, memory
 *  order MS4[0,0]..MS4[3,3]). Verbatim port of BuildRotMatrix4d (Math3D.pas:2548):
 *  six plane rotations LEFT-multiplied onto an identity start. Plane index tables
 *  i1=(1,0,0,0,1,2) i2=(2,2,1,3,3,3); each step composes `ms4 ← SM4_i · ms4`. */
export function mb3dSixPlaneToMat4(angles: number[]): number[] {
    const i1 = [1, 0, 0, 0, 1, 2];
    const i2 = [2, 2, 1, 3, 3, 3];
    let ms4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let i = 0; i < 6; i++) {
        const s = Math.sin(angles[i]), c = Math.cos(angles[i]);
        const a = i1[i], b = i2[i];
        const sm = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        sm[a * 4 + a] = c; sm[b * 4 + b] = c; sm[a * 4 + b] = -s; sm[b * 4 + a] = s;
        const out = new Array(16).fill(0);
        for (let r = 0; r < 4; r++) {
            for (let col = 0; col < 4; col++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) sum += sm[r * 4 + k] * ms4[k * 4 + col];
                out[r * 4 + col] = sum;
            }
        }
        ms4 = out;
    }
    return ms4;
}

/** MB3D angle option (degrees) → { sin, cos } — the .DOUBLEANGLE / .SINGLEANGLE
 *  const-buffer pair (packConstBuffer types 3/4). */
export function sinCosDeg(deg: number): { sin: number; cos: number } {
    return { sin: Math.sin(deg * DEG_TO_RAD), cos: Math.cos(deg * DEG_TO_RAD) };
}

// ── GMT conventions ──────────────────────────────────────────────────────────

const _rx = new THREE.Matrix4();
const _ry = new THREE.Matrix4();
const _rz = new THREE.Matrix4();
const _r4 = new THREE.Matrix4();

/** Euler angles (radians) → THREE.Matrix3, R = Z·X·Y. Mirrors
 *  UniformManager.buildRotMatrix (geometry pre/post/world matrices). Writes into
 *  `out` (module scratch state; copy the result if you keep it across calls). */
export function gmtEulerZxyToMat3(rx: number, ry: number, rz: number, out: THREE.Matrix3): THREE.Matrix3 {
    _rx.makeRotationX(rx);
    _ry.makeRotationY(ry);
    _rz.makeRotationZ(rz);
    _r4.identity().multiply(_rz).multiply(_rx).multiply(_ry);
    return out.setFromMatrix4(_r4);
}

/** Rodrigues rotation state from a `mode: 'rotation'` param's (azimuth, pitch,
 *  angle) — mirrors gmt_precalcRodrigues (features/geometry/transforms.ts)
 *  exactly: 0.001 dead-zone keeps the identity default; sin/cos are of the
 *  HALF angle (angle·0.5), consumed as-is by gmt_applyRodrigues. */
export function rodriguesSpherical(azimuth: number, pitch: number, angle: number): {
    axis: [number, number, number]; sin: number; cos: number;
} {
    if (Math.abs(angle) <= 0.001) return { axis: [0, 1, 0], sin: 0, cos: 1 };
    const cosPitch = Math.cos(pitch);
    const rotAngle = angle * 0.5;
    return {
        axis: [cosPitch * Math.sin(azimuth), Math.sin(pitch), cosPitch * Math.cos(azimuth)],
        sin: Math.sin(rotAngle),
        cos: Math.cos(rotAngle),
    };
}

/** The rotation AXIS of a `mode: 'rotation'` (azimuth, pitch) pair as a unit
 *  THREE.Vector3 — the display-side twin of {@link rodriguesSpherical}'s axis,
 *  used by the heliotrope/gizmo to draw the arrow. */
export function sphericalAxis(azimuth: number, pitch: number, out: THREE.Vector3): THREE.Vector3 {
    const cosPitch = Math.cos(pitch);
    return out.set(cosPitch * Math.sin(azimuth), Math.sin(pitch), cosPitch * Math.cos(azimuth));
}

// ── Display-orientation helpers (gizmo rendering — NOT wire contracts) ──────
//
// These compose a THREE.Matrix3 that visually represents a rotation param's
// current value so the canvas gizmo can orient its rings. They are display
// aids: per-ring EDITS map 1:1 to a component regardless of composition, so a
// convention nuance here shows up only as ring orientation, never as a wrong
// written value.

const _sq = new THREE.Quaternion();
const _sm4 = new THREE.Matrix4();

/** Sequential per-axis Euler (the `mode: 'axes'` formulas: X→YZ, then Y→XZ,
 *  then Z→XY applied in order) → Matrix3. Equivalent to R = Rz·Ry·Rx on
 *  column vectors. */
export function seqEulerXyzToMat3(rx: number, ry: number, rz: number, out: THREE.Matrix3): THREE.Matrix3 {
    _rx.makeRotationX(rx);
    _ry.makeRotationY(ry);
    _rz.makeRotationZ(rz);
    _r4.identity().multiply(_rz).multiply(_ry).multiply(_rx);
    return out.setFromMatrix4(_r4);
}

/** Axis-angle → Matrix3 (FULL angle — display of the composed rotation;
 *  contrast rodriguesSpherical's half-angle wire values). */
export function axisAngleToMat3(axis: THREE.Vector3, angle: number, out: THREE.Matrix3): THREE.Matrix3 {
    _sq.setFromAxisAngle(axis, angle);
    _sm4.makeRotationFromQuaternion(_sq);
    return out.setFromMatrix4(_sm4);
}

/** MB3D Euler (degrees) → Matrix3 for display — same math as mb3dEulerToMat3,
 *  loaded into a THREE.Matrix3 (row-major set()). */
export function mb3dEulerDegToMat3Display(xDeg: number, yDeg: number, zDeg: number, out: THREE.Matrix3): THREE.Matrix3 {
    const m = mb3dEulerToMat3(xDeg * DEG_TO_RAD, yDeg * DEG_TO_RAD, zDeg * DEG_TO_RAD);
    return out.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
}
