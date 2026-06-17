import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// Julia 3D — Václav Kučera, "New Generalizations of Quadratic Julia Sets to 3D"
// (Bridges 2019, pp. 441-444). https://archive.bridgesmathart.org/2019/bridges2019-441.pdf
//
// This one formula renders BOTH objects from the paper, chosen by the Variant
// selector, since they share the same Kleinian sphere-inversion machinery:
//
//   • LIMIT SET (Variant 0/1) — the paper's Figure 4 top, the limit set of the
//     sphere-inversion group Γ̃ rendered the way GMT renders Kleinian limit sets
//     (iterated inversion + fold; cf. KleinianJos, Apollonian). Variant 0 keeps
//     only g1,g2 (essentially-2D Γ̃₁); Variant 1 adds the g3 pair (truly-3D Γ̃₂).
//
//   • JULIA SET (Variant 2) — a reconstruction of the paper's escape-time 3D
//     Julia set (Figure 4 bottom), the pointwise "behaves like z²" construction
//     the paper omitted as "rather technical... work in progress." See below.
//
// THE GROUP. Five inversion spheres, all radius √3 with centres at distance 2
// from the origin — 2² = (√3)² + 1² makes every sphere ORTHOGONAL to the unit
// sphere, so all inversions preserve it (the group's invariant set):
//     g1:  S(-2, 0, 0; √3)        + reflection
//     g2:  S(1, ±√3, 0; √3)       + reflection   (a tangent pair)
//     g3:  S(1, 0, ±√3; √3)       + reflection   (the 3D-ifying pair)
//
// THE JULIA-SET RECONSTRUCTION. Kučera builds, on the unit circle, a map h that
// "behaves like z²" — piecewise from the generators, topologically conjugate to
// angle-doubling — and recovers z² off the circle by "simple radial scaling"
// r → r². So the escape-time map is H(w) = r²·h(w/|w|) + c. The omitted detail
// we recovered: lifting h to 3D needs the generators' shared "reflection in the
// real line" to become a 180° ROTATION about the x-axis, (x,y,z) → (x,-y,-z) —
// the unique isometry pairing the y-spheres AND the z-spheres at once. The
// obvious plane-reflection reading makes g2,g3 disagree by up to 4.9 along their
// sphere-overlap circles (cracks); the rotation lift makes them agree to 8e-16
// while preserving the 2D vertex behaviour exactly. A hard nearest-cap selection
// then gives a crack-free surface on the symmetry planes (e.g. the c=(-1,0,0)
// 3D Basilica) — the one residual is faint seams in the small overlap lenses,
// where a fully continuous map needs the conjugacy φ (future work).
export const Julia3D: FractalDefinition = {
    id: 'Julia3D',
    name: 'Julia 3D (Kučera)',
    shortDescription: 'Kučera\'s 3D Julia generalization (Bridges 2019) — both the Kleinian limit set and the escape-time Julia set, by Variant.',
    description: 'Václav Kučera\'s 3D generalization of quadratic Julia sets (Bridges 2019). The Variant selector switches between the two objects in the paper, which share the same sphere-inversion group. LIMIT SET: the limit set of five radius-√3 spheres orthogonal to the unit sphere — an Apollonian-like 3D packing (Inflated Γ̃₁ drops the third sphere pair; True 3D Γ̃₂ adds it). JULIA SET: a reconstruction of the paper\'s omitted escape-time construction, H(w)=r²·h(w/|w|)+c, where h is built from the generators with their shared reflection lifted to 3D as a 180° x-rotation (the recovered detail that prevents cracking). Default c=(-1,0,0) gives the 3D Basilica.',
    juliaType: 'julia',
    tags: ['julia', 'kleinian', 'inversion', 'apollonian', 'bridges', 'limit-set', 'basilica'],

    shader: {
        preamble: `
// Julia3D running state — declared here so getDist sees the final values.
// Limit-set DE reads kk_minSurf; the Julia-set DE reads only r and dr.
float kk_minSurf = 1e10;

// Conditional inversion in sphere (centre cen, radius² R2). Continuous: the
// inversion is the identity on |z-cen| = R, so gating it at the boundary is
// seamless. Updates dr by the conformal factor R2/|z-cen|². (Limit-set mode.)
void kk_invert(inout vec3 z, inout float dr, vec3 cen, float R2) {
    vec3 d = z - cen;
    float dd = dot(d, d);
    if (dd < R2) {                       // strictly inside → invert
        float k = R2 / max(dd, 1e-9);
        z = cen + k * d;
        dr *= k;
    }
}`,
        preambleVars: ['kk_minSurf'],

        function: `
    void formula_Julia3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        gmt_applyRodrigues(p);

        if (uParamC < 1.5) {
            // ───────── LIMIT SET (Variant 0 = Γ̃₁ 2D, 1 = Γ̃₂ 3D) ─────────
            // Julia/offset translation — drags the limit set off the symmetry planes.
            p += c.xyz;

            // Reflections as abs-folds: reduces the five generator spheres to
            // three representatives below.
            p.y = abs(p.y);
            p.z = abs(p.z);

            float R = uParamA;          // sphere radius (faithful √3)
            float R2 = R * R;
            float dC = uParamB;         // centre distance from origin (faithful 2)
            float hh = dC * 0.8660254037844386; // √3/2 · dC

            // Fixed-order conditional inversions (each continuous on its own sphere).
            kk_invert(p, dr, vec3(-dC, 0.0, 0.0), R2);          // g1
            kk_invert(p, dr, vec3(0.5 * dC, hh, 0.0), R2);      // g2
            if (uParamC > 0.5) {
                kk_invert(p, dr, vec3(0.5 * dC, 0.0, hh), R2);  // g3 — Γ̃₂
            }

            // Nearest generator-sphere surface (signed) for the DE.
            float s1 = length(p - vec3(-dC, 0.0, 0.0)) - R;
            float s2 = length(p - vec3(0.5 * dC, hh, 0.0)) - R;
            float surf = min(s1, s2);
            if (uParamC > 0.5) surf = min(surf, length(p - vec3(0.5 * dC, 0.0, hh)) - R);
            kk_minSurf = surf;

            z.xyz = p;
            trap = min(trap, abs(dot(p, p) - 1.0));
        } else {
            // ───────── JULIA SET (Variant 2) — escape-time H(w)=r²·h(w/|w|)+c ─────────
            float r = length(p);
            if (r < 1e-9) { z.xyz = c.xyz; trap = min(trap, dot(c.xyz, c.xyz)); return; }
            vec3 u = p / r;

            // Nearest of the 5 inversion-sphere centre directions (faithful √3, d=2):
            // (-1,0,0) and (1,±√3,0)/2, (1,0,±√3)/2.
            float d1  = -u.x;
            float d2p = 0.5 * u.x + 0.8660254037844386 * u.y;
            float d2m = 0.5 * u.x - 0.8660254037844386 * u.y;
            float d3p = 0.5 * u.x + 0.8660254037844386 * u.z;
            float d3m = 0.5 * u.x - 0.8660254037844386 * u.z;

            float bv = d1; vec3 cc = vec3(-2.0, 0.0, 0.0);
            if (d2p > bv) { bv = d2p; cc = vec3(1.0,  1.7320508075688772, 0.0); }
            if (d2m > bv) { bv = d2m; cc = vec3(1.0, -1.7320508075688772, 0.0); }
            if (d3p > bv) { bv = d3p; cc = vec3(1.0, 0.0,  1.7320508075688772); }
            if (d3m > bv) { bv = d3m; cc = vec3(1.0, 0.0, -1.7320508075688772); }

            // Inside the nearest 60° cap → invert in that sphere; on the cap rim
            // the inversion is the identity, so leaving into the fundamental
            // domain (h = u) is seamless. R² = 3.
            vec3 hh; float S = 1.0;
            if (bv > 0.5) {
                vec3 dv = u - cc;
                float dd = max(dot(dv, dv), 1e-9);
                S = 3.0 / dd;
                hh = cc + S * dv;
            } else {
                hh = u;
            }

            // The recovered detail: shared reflection lifted as a 180° rotation
            // about the x-axis (NOT a plane reflection).
            hh = vec3(hh.x, -hh.y, -hh.z);

            float pw = max(uParamE, 1.0);     // radial power (faithful 2)
            float rp = pow(r, pw);
            // Multiplicative Julia derivative: r^(pw-1)·max(pw, S).
            dr *= pow(r, pw - 1.0) * max(pw, S);

            p = rp * hh + c.xyz;
            z.xyz = p;
            trap = min(trap, dot(p, p));
        }
    }`,
        loopBody: `formula_Julia3D(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B); kk_minSurf = 1e10;`,
        usesSharedRotation: true,

        // Branch the DE on the Variant: limit-set surface distance vs the
        // analytic escape-time DE (0.5·r·ln r / dr).
        getDist: `
            if (uParamC < 1.5) {
                float d = uParamD * abs(kk_minSurf) / max(dr, 1e-9);
                return vec2(d, iter);
            }
            float d = 0.5 * log(max(r, 1.0e-5)) * r / max(dr, 1e-9);
            return vec2(d, iter);
        `,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'iter:shared-rotation', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Sphere Radius', id: 'paramA', min: 1.4, max: 2.2, step: 0.0001, default: 1.7320508 },
        { label: 'Centre Distance', id: 'paramB', min: 1.6, max: 2.6, step: 0.0001, default: 2.0 },
        {
            label: 'Variant', id: 'paramC', min: 0, max: 2, step: 1, default: 2, options: [
                { label: 'Limit set — Inflated (Γ̃₁)', value: 0 },
                { label: 'Limit set — True 3D (Γ̃₂)', value: 1 },
                { label: 'Julia set (escape-time)', value: 2 },
            ]
        },
        { label: 'DE Scale (limit set)', id: 'paramD', min: 0.1, max: 1.5, step: 0.001, default: 0.7 },
        { label: 'Radial Power (Julia set)', id: 'paramE', min: 1.0, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
    ],

    defaultPreset: {
        formula: 'Julia3D',
        features: {
            coreMath: {
                iterations: 16,
                paramA: 1.7320508,
                paramB: 2.0,
                paramC: 2,        // open on the Julia set (3D Basilica)
                paramD: 0.7,
                paramE: 2.0,
                vec3B: { x: 0, y: 0, z: 0 },
            },
            // Default scene: the paper's 3D Basilica, c = -1 on the real (x) axis.
            geometry: { juliaMode: true, juliaX: -1.0, juliaY: 0, juliaZ: 0 },
            quality: {
                detail: 3,
                pixelThreshold: 0.4,
                maxSteps: 500,
                fudgeFactor: 0.6,
                estimator: 0,
            },
            optics: { camFov: 60 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 3.2, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.2,
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
