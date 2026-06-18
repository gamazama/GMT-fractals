/**
 * Shared GGX VNDF importance sampler — single source of truth for both the
 * path tracer's bounce direction and the raymarched reflection direction.
 *
 * Method: bounded spherical-cap VNDF sampling — Dupuy & Benyoub 2023
 * ("Sampling Visible GGX Normals with Spherical Caps") with the bounded cap of
 * Eto & Tokuyoshi 2024 ("Bounded VNDF Sampling for the Smith-GGX BRDF"). Cheaper
 * than Heitz 2018, never samples below the horizon, and the bound tightens the
 * cap so fewer occluded normals are drawn on rough surfaces. Reduces exactly to
 * the unbounded spherical cap when k = 1.
 *
 * Returns a WORLD-space half-vector (microfacet normal) drawn from the VNDF
 * conditioned on viewDir. When the caller samples a reflection via
 * reflect(incoming, H), the single-sample specular weight collapses to the
 * bounded F * G1(L) — no grazing-angle fireflies.
 *
 * @invariant Self-contained: inlines a branchless Duff 2017 ONB and uses no
 *   external helpers (no buildTangentBasis, no TAU define), so it can be emitted
 *   under any function name into either the PT chunk or the Direct shading chunk
 *   — which are mutually exclusive shaders — without symbol collisions.
 * @see docs/adr/0068-raymarched-reflection-importance-sampling.md
 */
export const getVNDFSamplerGLSL = (fnName: string) => `
vec3 ${fnName}(vec3 n, vec3 viewDir, float roughness, vec2 u) {
    float alpha = roughness * roughness;  // perceptual roughness → GGX alpha

    // Branchless orthonormal basis around n (Duff et al. 2017).
    float sgn = n.z >= 0.0 ? 1.0 : -1.0;
    float aOnb = -1.0 / (sgn + n.z);
    float cOnb = n.x * n.y * aOnb;
    vec3 t = vec3(1.0 + sgn * n.x * n.x * aOnb, sgn * cOnb, -sgn * n.x);
    vec3 b = vec3(cOnb, sgn + n.y * n.y * aOnb, -n.y);

    // View direction in tangent space (z-up = surface normal).
    vec3 wi = vec3(dot(viewDir, t), dot(viewDir, b), dot(viewDir, n));
    // Warp to the hemisphere configuration.
    vec3 wiStd = normalize(vec3(alpha * wi.x, alpha * wi.y, wi.z));

    // Bounded spherical cap: lower z bound -bnd instead of -wiStd.z.
    float phi = 6.28318530718 * u.x;
    float a2 = alpha * alpha;
    float s = 1.0 + length(wi.xy);  // isotropic; sgn omitted since alpha <= 1
    float s2 = s * s;
    float k = (1.0 - a2) * s2 / (s2 + a2 * wi.z * wi.z);
    float bnd = wi.z > 0.0 ? k * wiStd.z : wiStd.z;
    float z = (1.0 - u.y) * (1.0 + bnd) - bnd;
    float sinTheta = sqrt(clamp(1.0 - z * z, 0.0, 1.0));
    vec3 c = vec3(sinTheta * cos(phi), sinTheta * sin(phi), z);

    // Microfacet normal in hemisphere config → unwarp to ellipsoid → world.
    vec3 wmStd = c + wiStd;
    vec3 wm = normalize(vec3(alpha * wmStd.x, alpha * wmStd.y, wmStd.z));
    return normalize(t * wm.x + b * wm.y + n * wm.z);
}
`;
