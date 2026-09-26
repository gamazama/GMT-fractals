import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// "INFLATED" 3D JULIA SETS in the spirit of Kučera's Γ̃₁ (Bridges 2019 — the
// construction the paper says works for ARBITRARY c ∈ ℝ³), realised as the
// azimuthal suspension of his exact 2D circle map h. NOTE: the paper omits the
// pointwise 3D map; this suspension is OUR choice of inflation — its xy-plane
// restriction is exactly Kučera's 2D family, its latitude action is neutral
// (p.z carried through). Other latitude couplings are possible and would
// change the vertical character of the sets (currently thin fins/sheets).
//
// The 2D map (paper p.443): on the unit circle C₀, with q = 1+√3i and vertices
// A = 1, B = e^{2πi/3}, C = e^{−2πi/3}:
//
//   arc AB (azimuth   0°..120°):  h = g₂  : ζ ↦ q̄ + 3/(ζ − q)
//   arc BC (azimuth 120°..240°):  h = g₁  : ζ ↦ −2 + 3/(ζ + 2)
//   arc CA (azimuth 240°..360°):  h = g₂⁻¹: ζ ↦ q  + 3/(ζ − q̄)
//
// Each generator preserves C₀; the pieces agree at A, B, C (g₂(A)=A=A²,
// g₁(B)=g₂(B)=C=B², g₁(C)=g₂(C)=B=C²) and map each 120° arc 1-to-1 onto the
// complementary 240° arc: h is a CONTINUOUS, orientation-preserving, DEGREE-2
// COVERING of the circle, topologically conjugate to z² (winding number 2.0000,
// junction jumps ~1e-9, |h|−1 ~ 1e-15 — probe h:\tmp\kucera2d_family.mjs).
//
// 3D: suspend azimuthally. For p on the unit sphere write p = (ρ·u, p.z) with
// u = p.xy/ρ on the unit circle; map u by h, keep (ρ, p.z):  Φ(p) = (ρ·h(u), p.z).
// Φ is a continuous DEGREE-2 BRANCHED COVER of S² (critical points at the
// poles, local homeo elsewhere) — no folds, no seams, for every c. Then the
// quadratic-family extension exactly as in the paper: H(w) = c + r²·Φ(w/r).
//
// WHY THIS MATTERS (the dynamics-class story): "quadratic dynamics" = the
// angular map is a branched cover. Covers give Mandelbrot-class parameter
// spaces (test: juliaMode off ⇒ c = z) and quadratic-family Julia sets for all
// c; folded maps (any construction invariant under an orientation-reversing
// involution — amoser's 45° fold, the dihedral double-fold) are degree 0,
// crease along the fold locus, and give burning-ship-class dynamics. paramA=1
// here folds the azimuth across the real axis before applying h — the SAME
// pieces flip to BS-class; the 2D pair kucera2d_param.png (Mandelbrot-like) vs
// kucera2d_fold_param.png (BS-like) is this toggle rendered in 2D.
//
// LIMITATION (honest): this is the paper's "inflated" family — fractal
// structure essentially 2D (azimuthal), transversally tame (latitude rides
// along). The truly-3D construction (Γ̃₂, limit set = whole sphere) remains
// open; a continuous piecewise-Möbius degree-2 cover of S² provably does not
// exist, so it needs genuinely non-conformal pieces — see
// plans/julia3d-offaxis-notes.md.
export const Julia3DKucera: FractalDefinition = {
    id: 'Julia3DKucera',
    name: 'Julia 3D Kučera (inflated)',
    shortDescription: 'Kučera\'s inflated 3D Julia sets (Bridges 2019): azimuthal suspension of his exact degree-2 circle map — genuine quadratic dynamics for any c.',
    description: 'Kučera\'s "inflated" 3D generalization of quadratic Julia sets (Bridges 2019, Γ̃₁): his piecewise-Möbius degree-2 circle map h (built from Kleinian-group generators, topologically conjugate to z²) suspended azimuthally to the sphere, then extended by radial scaling: H(w) = c + r²·Φ(w/r). Φ is a true degree-2 branched cover — no folds, no seams — so the family has genuine quadratic dynamics for arbitrary c ∈ ℝ³: Mandelbrot-class parameter space (turn Julia mode off), quadratic-family Julia sets. The Fold-compare mode folds the azimuth first, flipping the same map to burning-ship-class dynamics.',
    juliaType: 'julia',
    tags: ['julia', 'kleinian', 'kucera', 'bridges', 'quadratic'],

    shader: {
        function: `
    // a + 3/(z - b), complex.
    vec2 kc_mob(vec2 z, vec2 a, vec2 b) {
        vec2 d = z - b;
        float dd = max(dot(d, d), 1e-20);
        return a + 3.0 * vec2(d.x, -d.y) / dd;
    }

    // Kučera's 2D h on the unit circle (u must be unit). Degree-2 cover.
    vec2 kc_h(vec2 u) {
        float phi = atan(u.y, u.x);              // [-pi, pi]
        const float T = 2.0943951023931953;      // 2*pi/3
        const vec2 q  = vec2(1.0,  1.7320508075688772);   // 1 + sqrt(3) i
        const vec2 qb = vec2(1.0, -1.7320508075688772);   // conj
        vec2 hz;
        if (phi >= 0.0 && phi < T)       hz = kc_mob(u, qb, q);              // g2  : arc AB
        else if (phi >= -T && phi < 0.0) hz = kc_mob(u, q, qb);              // g2⁻¹: arc CA
        else                             hz = kc_mob(u, vec2(-2.0, 0.0), vec2(-2.0, 0.0)); // g1: arc BC
        return normalize(hz);                    // kill float drift off C0
    }

    void formula_Julia3DKucera(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 zz = z.xyz;
        float r2 = dot(zz, zz);
        float r = sqrt(max(r2, 1e-20));

        // Quadratic radial law (paper: "simple radial scaling"): dz = 2·r·dz.
        // h's angular expansion ranges 1..3 (avg 2), so pair with fudge ≤ 0.6.
        dr = 2.0 * r * dr;

        vec3 p = zz / r;
        float rho = length(p.xy);

        vec3 np;
        if (rho < 1e-8) {
            np = p;                              // poles are the critical points (fixed)
        } else {
            vec2 u = p.xy / rho;
            // paramA = 1: fold azimuth across the real axis BEFORE h — the
            // burning-ship-class comparison mode (continuous, degree 0).
            if (uParamA > 0.5) { u.y = abs(u.y); }
            vec2 hu = kc_h(u);
            np = vec3(rho * hu, p.z);            // azimuthal suspension: |np| = 1
        }

        zz = c.xyz + np * r2;

        z.xyz = zz;
        trap = min(trap, min(min(abs(zz.x), abs(zz.y)), abs(zz.z)));
    }`,
        loopBody: `formula_Julia3DKucera(z, dr, trap, c);`,
        // amoser's analytic DE shape: 0.2·log(r²)·r / dz.
        getDist: `
            float d = 0.2 * log(max(r*r, 1e-10)) * r / max(dr, 1e-9);
            return vec2(d, iter);
        `,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Map', id: 'paramA', min: 0, max: 1, step: 1, default: 0, options: [
            { label: 'Kučera cover (quadratic)', value: 0 },
            { label: 'Folded (burning-ship-class)', value: 1 },
        ] },
    ],

    defaultPreset: {
        formula: 'Julia3DKucera',
        features: {
            coreMath: {
                iterations: 30,
                paramA: 0,
            },
            // The inflated Basilica — direct comparison with paper Figure 3 (bottom).
            geometry: { juliaMode: true, juliaX: -1.0, juliaY: 0, juliaZ: 0 },
            quality: {
                detail: 3,
                pixelThreshold: 0.4,
                maxSteps: 500,
                fudgeFactor: 0.5,
                estimator: 0,
            },
            optics: { camFov: 60 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 3.4, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.4,
        cameraMode: 'Orbit',
        lights: [
            {
                type: 'Directional',
                position: { x: 0.6, y: 1, z: 0.5 },
                rotation: { x: 0, y: 0, z: 0 },
                color: '#fff2d9',
                intensity: 1.2,
                falloff: 0,
                falloffType: 'Quadratic',
                fixed: false,
                visible: true,
                castShadow: true,
            },
        ],
    },
};
