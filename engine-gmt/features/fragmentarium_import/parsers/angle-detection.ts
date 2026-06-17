/**
 * Shared angle/degrees heuristics for the Fragmentarium import pipelines.
 *
 * Lives in `parsers/` (neutral shared infrastructure both V3 and V4 import from)
 * so the two pipelines agree on what a "degrees" slider range looks like.
 */

/**
 * Does a slider [min,max] look like a real DEGREES range — i.e. the stored
 * value is in degrees and should display as π notation? True when the range
 * spans at least ~180° or straddles ±90 (e.g. [-180,180], [0,360], [-90,90]).
 * Radian / normalized ranges (±π≈±3.14, ±1) do NOT qualify.
 */
export function looksLikeDegreesRange(rangeMin: number, rangeMax: number): boolean {
    const span = Math.abs(rangeMax - rangeMin);
    return span >= 180 || (rangeMin <= -90 && rangeMax >= 90);
}

// Name substrings that mark an angle parameter. Union of the old V3 and V4
// lists so both pipelines agree (V3 lacked phi/roll; V4 lacked heading/tilt).
// `rot` is matched separately with a guard so it does NOT hit 'protrude' /
// 'rotation_count' (V4 previously used a loose `rot` substring).
const ANGLE_NAME_SUBSTRINGS = ['angle', 'theta', 'phi', 'yaw', 'pitch', 'roll', 'heading', 'tilt'];

/**
 * Does a uniform NAME look like an angle parameter? Shared by V3 + V4 so the
 * same formula gets the same π/degrees treatment whichever pipeline runs it.
 */
export function looksLikeAngleName(name: string): boolean {
    const n = name.toLowerCase();
    return ANGLE_NAME_SUBSTRINGS.some(s => n.includes(s))
        || /\brot(?:$|angle|ation|[xyz]?\b)/.test(n);
}

/**
 * A param should display in DEGREES (π notation) iff its name looks angular AND
 * its range looks like a degrees range. The single rule both pipelines use —
 * no name-only or range-only shortcut (a non-angle slider that merely spans
 * 0..360 stays linear).
 */
export function isDegreesParam(name: string, rangeMin: number, rangeMax: number): boolean {
    return looksLikeAngleName(name) && looksLikeDegreesRange(rangeMin, rangeMax);
}
