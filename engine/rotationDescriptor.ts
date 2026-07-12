/**
 * RotationDescriptor — what a rotation-valued param's components actually MEAN.
 *
 * A "rotation vec3" in this codebase is one of several distinct encodings
 * (per-axis Euler angles, spherical axis + roll angle, unit direction, single
 * twist angle) in either radians or degrees. Historically the encoding was
 * implied by the loose widget `mode` string; this descriptor makes it explicit
 * so the vector widgets, the canvas rotation gizmo, and the CPU→GPU rotation
 * conversion layer (engine-gmt/utils/rotationMath.ts) all read one contract.
 *
 * Zero-dependency on purpose: imported (type-only where possible) by
 * engine-core param defs (FeatureSystem.ParamConfig), pure UI primitives
 * (components/vector-input), and engine-gmt formula defs (FractalParameter).
 *
 * @invariant `order` names a CONVENTION, not just an axis sequence — each value
 * corresponds to one named conversion in rotationMath.ts and they produce
 * visually different results for the same angles. Never collapse them.
 */

export type RotationKind =
    /** Per-axis Euler angles; composition convention given by `order`. */
    | 'euler'
    /** (azimuth, pitch, angle): spherical rotation-axis + roll angle, applied
     *  via Rodrigues (the `mode: 'rotation'` formulas' gmt_precalcRodrigues). */
    | 'axis-angle'
    /** Unit direction vector — an axis with no roll. */
    | 'direction'
    /** Single angle about an implied axis (Z-twist style scalars). */
    | 'twist';

export type EulerOrder =
    /** UniformManager.buildRotMatrix: R = Z·X·Y (geometry pre/post/world). */
    | 'gmt-zxy'
    /** MB3D BuildRotMatrix (Math3D.pas:2478): R = Rx·Ry·Rz, degrees-native. */
    | 'mb3d-xyz'
    /** Sequential per-axis mat2 rotations inside formula GLSL, X→Y→Z
     *  (the `mode: 'axes'` formulas). */
    | 'seq-xyz';

export interface RotationDescriptor {
    kind: RotationKind;
    /** Units of the STORED value. Display/edit may convert, storage never does. */
    units: 'rad' | 'deg';
    /** Euler composition convention; meaningful only when kind === 'euler'. */
    order?: EulerOrder;
}

/**
 * Derive a descriptor from the legacy widget `mode` string, for params that
 * predate the explicit field. All legacy modes store radians.
 * Returns null for non-rotation modes ('toggle', 'mixed', 'normal', absent).
 */
export function rotationFromMode(mode?: string): RotationDescriptor | null {
    switch (mode) {
        case 'rotation': return { kind: 'axis-angle', units: 'rad' };
        case 'axes': return { kind: 'euler', units: 'rad', order: 'seq-xyz' };
        case 'direction': return { kind: 'direction', units: 'rad' };
        default: return null;
    }
}

/** Explicit descriptor if present, else the legacy-mode derivation. */
export function resolveRotation(param: { rotation?: RotationDescriptor; mode?: string }): RotationDescriptor | null {
    return param.rotation ?? rotationFromMode(param.mode);
}
