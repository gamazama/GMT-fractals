
/**
 * Shared GLSL transform utilities used by multiple formulas.
 * Injected once by GeometryFeature — formulas call these instead of duplicating the code.
 */

export const SHARED_TRANSFORMS_GLSL = `
// --- GMT Shared Transforms ---
// Rodrigues rotation state (pre-calculated once per frame in loopInit)
vec3 gmt_rotAxis = vec3(0.0, 1.0, 0.0);
float gmt_rotCos = 1.0;
float gmt_rotSin = 0.0;

void gmt_precalcRodrigues(vec3 params) {
    if (abs(params.z) > 0.001) {
        float azimuth = params.x;
        float pitch = params.y;
        float rotAngle = params.z * 0.5;
        float cosPitch = cos(pitch);
        gmt_rotAxis = vec3(
            cosPitch * sin(azimuth),
            sin(pitch),
            cosPitch * cos(azimuth)
        );
        gmt_rotSin = sin(rotAngle);
        gmt_rotCos = cos(rotAngle);
    }
}

void gmt_applyRodrigues(inout vec3 z) {
    if (abs(gmt_rotSin) > 0.0001) {
        z = z * gmt_rotCos + cross(gmt_rotAxis, z) * gmt_rotSin
            + gmt_rotAxis * dot(gmt_rotAxis, z) * (1.0 - gmt_rotCos);
    }
}

void gmt_applyTwist(inout vec3 z, float amount) {
    if (abs(amount) > 0.001) {
        float ang = z.z * amount;
        float s = sin(ang);
        float co = cos(ang);
        z.xy = mat2(co, -s, s, co) * z.xy;
    }
}
`;
