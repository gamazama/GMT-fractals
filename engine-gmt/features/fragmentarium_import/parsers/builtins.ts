/**
 * Fragmentarium Standard Library Builtins
 *
 * GLSL implementations of common Fragmentarium helper functions from:
 *   - MathUtils.frag  (rotationMatrix3, Rotate2D, rotationMatrix2)
 *   - DE-Raytracer.frag (frag_boxFold — see note below)
 *
 * Injected automatically when #include directives are detected in .frag files
 * so imported formulas can reference these helpers without needing the original
 * Fragmentarium install.
 *
 * GMT shader collision notes:
 *   - sphereFold(inout vec3, inout float, float, float) — ALREADY in GMT's math.ts
 *     with the SAME signature; do NOT re-inject it.
 *   - boxFold(inout vec3, inout float, float) — GMT has a DIFFERENT signature (float
 *     foldLimit instead of vec3 r).  We inject Fragmentarium's version as frag_boxFold
 *     and rename calls in the formula body accordingly.
 *   - rotationMatrix3 / rotationMatrix2 / Rotate2D — NOT in GMT, safe to inject.
 *   - sdBox / sdSphere — NOT in GMT, safe to inject.
 */

export const FRAG_BUILTIN_ROTATIONS = `
// PI is defined in Fragmentarium's MathUtils.frag but not in GLSL ES.
#ifndef PI
#define PI 3.14159265358979323846264
#endif

mat3 rotationMatrix3(vec3 v, float angle) {
    float c = cos(radians(angle));
    float s = sin(radians(angle));
    float oc = 1.0 - c;
    vec3 n = normalize(v);
    return mat3(
        oc*n.x*n.x+c,       oc*n.x*n.y-n.z*s,  oc*n.z*n.x+n.y*s,
        oc*n.x*n.y+n.z*s,   oc*n.y*n.y+c,       oc*n.y*n.z-n.x*s,
        oc*n.z*n.x-n.y*s,   oc*n.y*n.z+n.x*s,   oc*n.z*n.z+c
    );
}

mat2 rotationMatrix2(float angle) {
    float c = cos(radians(angle));
    float s = sin(radians(angle));
    return mat2(c, -s, s, c);
}

void Rotate2D(inout vec2 v, float angle) {
    v = rotationMatrix2(angle) * v;
}

// Euler XYZ rotation matrix from a vec3 of angles in degrees
mat3 rotationMatrixXYZ(vec3 a) {
    float cx = cos(radians(a.x)), sx = sin(radians(a.x));
    float cy = cos(radians(a.y)), sy = sin(radians(a.y));
    float cz = cos(radians(a.z)), sz = sin(radians(a.z));
    return mat3(
        cy*cz,              cy*sz,              -sy,
        sx*sy*cz - cx*sz,   sx*sy*sz + cx*cz,   sx*cy,
        cx*sy*cz + sx*sz,   cx*sy*sz - sx*cz,   cx*cy
    );
}
`;

/**
 * Fragmentarium's boxFold uses vec3 r (per-axis fold limits), whereas GMT's
 * built-in boxFold uses a scalar foldLimit.  We inject this under the name
 * frag_boxFold to avoid a signature conflict, and rename calls in the formula.
 *
 * sphereFold is intentionally OMITTED — GMT's math.ts already provides it with
 * the identical signature (inout vec3, inout float, float, float).
 */
export const FRAG_BUILTIN_FOLDS = `
void frag_boxFold(inout vec3 z, vec3 r) {
    z = clamp(z, -r, r) * 2.0 - z;
}
`;

export const FRAG_BUILTIN_MATH = `
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}
`;

/**
 * mat4 homogeneous transform helpers from Fragmentarium's MathUtils.frag.
 * Required by formulas that use rotationMatrix(vec3, float) → mat4,
 * translate(vec3) → mat4, or scale4(float) → mat4 (e.g. Icosahedron, Dodecahedron).
 * Note: rotationMatrix3 (mat3 version) lives in FRAG_BUILTIN_ROTATIONS above.
 */
export const FRAG_BUILTIN_MAT4 = `
mat4 rotationMatrix(vec3 v, float angle) {
    float c = cos(radians(angle));
    float s = sin(radians(angle));
    return mat4(
        c + (1.0-c)*v.x*v.x,         (1.0-c)*v.x*v.y - s*v.z,  (1.0-c)*v.x*v.z + s*v.y,  0.0,
        (1.0-c)*v.x*v.y + s*v.z,  c + (1.0-c)*v.y*v.y,         (1.0-c)*v.y*v.z - s*v.x,  0.0,
        (1.0-c)*v.x*v.z - s*v.y,  (1.0-c)*v.y*v.z + s*v.x,  c + (1.0-c)*v.z*v.z,         0.0,
        0.0,                       0.0,                       0.0,                           1.0
    );
}

mat4 translate(vec3 v) {
    return mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        v.x, v.y, v.z, 1.0
    );
}

mat4 scale4(float s) {
    return mat4(
        s,   0.0, 0.0, 0.0,
        0.0, s,   0.0, 0.0,
        0.0, 0.0, s,   0.0,
        0.0, 0.0, 0.0, 1.0
    );
}
`;

/**
 * Complex number helpers from Fragmentarium's Complex.frag.
 * cPow(vec2, float) — raises a complex number to a real power.
 * cMul(vec2, vec2)  — complex multiplication.
 */
export const FRAG_BUILTIN_COMPLEX = `
vec2 cPow(vec2 z, float p) {
    float r = length(z);
    if (r == 0.0) return vec2(0.0);
    float theta = atan(z.y, z.x);
    return pow(r, p) * vec2(cos(p * theta), sin(p * theta));
}

vec2 cMul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}
`;

/**
 * Returns a combined GLSL builtin string appropriate for the detected #include files.
 */
export function getBuiltinsForIncludes(includes: string[]): string {
    if (includes.length === 0) return '';

    const parts: string[] = [];
    const lower = includes.map(i => i.toLowerCase());

    if (lower.some(n => n.includes('mathutils'))) {
        parts.push(FRAG_BUILTIN_ROTATIONS);
        parts.push(FRAG_BUILTIN_MAT4);
        parts.push(FRAG_BUILTIN_MATH);
    }

    if (lower.some(n =>
        n.includes('de-raytracer') ||
        n.includes('de_raytracer') ||
        n.includes('mandelbox')
    )) {
        parts.push(FRAG_BUILTIN_FOLDS);
    }

    if (lower.some(n => n.includes('complex'))) {
        parts.push(FRAG_BUILTIN_COMPLEX);
    }

    return parts.join('\n');
}
