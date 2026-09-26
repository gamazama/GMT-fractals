import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// ─────────────────────────────────────────────────────────────────────────────
// amoser's own reconstruction of Kučera's 3D Julia set. He first shared it
// privately as a distance-estimator reference and it stayed out of this repo at
// his request; published with his approval 2026-09-26.
// ─────────────────────────────────────────────────────────────────────────────
//
// THE CONSTRUCTION (amoser). Rather than the explicit sphere-inversion generators,
// amoser realises Kučera's "behaves like z²" map as a single LATTÈS MAP on the
// Riemann sphere, reached by stereographic projection — so it is one global
// analytic rational map with no piecewise region boundaries to crack:
//
//   project p (unit sphere) → complex plane:   w = stereographic(p)
//   Lattès step:                               w → (w² + i)/(1 + i·w²)  =  M(w²)
//   unproject back to the sphere:              p' = stereographic⁻¹(w)
//   radial scaling + Julia constant:           z  = c + p'·r²
//
// M(w) = (w+i)/(iw+1) fixes ±1 (→ (±1,0,0) on the sphere), i.e. M is a 90°
// rotation of the Riemann sphere about the x-axis. So the map is
// (90° x-rotation) ∘ (square): the squaring is the angle-doubling "z²", the
// rotation gives it the sphere symmetry that lets it live in 3D. The composite is
// post-critically finite with a (2,2,2,2) orbifold — a genuine Lattès map, which
// is *why* a degree-2 map can carry this symmetry.
//
// OFF-AXIS c — STATUS (2026-07-01). Two results, one negative verdict:
//
// (1) The dihedral double-fold (paramA=2) makes the map CONTINUOUS for all c:
// amoser's single 45° fold folds {|z|>|y|} with one reflection k+ (swap y,z);
// the image wedge's second boundary y=−z is not k+'s fixed plane, so the map
// jumps there by exactly rho_x(180°) (k+ restricted to that plane IS rho_x(180°),
// and B∘rho = rho∘B for the bare Lattès map B) — invisible iff rho fixes c, i.e.
// c on the x-axis. Folding TWICE, each across the folding reflection's own fixed
// plane (y=z then y=−z), is continuous everywhere (Lipschitz 2.0 = bare map, vs
// 9850 seamed), and differs from amoser's fold only by an extra rho_x(180°) on
// the south/west caps, which commutes with B and fixes on-axis c — so on-axis
// sets and renders are EXACTLY amoser's (0/30000 escape mismatches).
//
// (2) BUT (amoser's verdict, correct): continuity was bought with a second fold,
// and fold-invariance is the defining move of the BURNING-SHIP family. A folded
// map is not a local homeomorphism along its fold circles — it creases space —
// so off-axis (and in parameter space, c=z) the dynamics is folded/real, not
// complex-quadratic: BS-class, not Mandelbrot-class. This is provable, not a
// tuning issue: any continuous map invariant under an orientation-reversing
// reflection has topological degree 0, so NO fold construction can be a degree-2
// branched cover — and "degree-2 branched cover" is precisely what "quadratic
// dynamics" means. amoser's original evades BS-ness on-axis only because there
// the fold jump is a deck-like symmetry of the dynamics (same reason the Burning
// Ship agrees with the Mandelbrot family on the real axis).
//
// The genuine target is a degree-2 branched COVER of S² (equivariant, not
// fold-invariant) with Kučera's group structure (worked through in the owner's
// off-axis research notes, kept outside this repo).
//
// DEAD END (kept as the "Aim set along c" toggle, paramB, default OFF):
// conjugating the map by a rotation R: ĉ→x̂ IS seam-free, but it is degenerate —
// H = R⁻¹∘H'∘R is exactly conjugate to the ON-AXIS map H' with c'=(±|c|,0,0), so
// it merely rotates the on-axis set to point along c (and rescales by |c|). It
// produces NO genuinely-new off-axis structure.
export const Julia3DLattes: FractalDefinition = {
    id: 'Julia3DLattes',
    name: 'Julia 3D Lattès (amoser)',
    shortDescription: 'amoser\'s Lattès-map reconstruction of Kučera\'s 3D Julia set.',
    description: 'amoser\'s reconstruction of Kučera\'s 3D Julia set as a Lattès map on the Riemann sphere: stereographic-project, apply M(w²) with M a 90° x-rotation, unproject, scale by r² and add c. One global analytic map — no region seams. A 45° fold supplies the sphere symmetry; like amoser\'s original it is faithful for c on the x-axis.',
    juliaType: 'julia',
    tags: ['julia', 'kleinian', 'lattes', 'bridges'],

    shader: {
        function: `
    vec2 jl_cdiv(vec2 a, vec2 b) {
        float d = max(dot(b, b), 1e-20);
        return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d;
    }

    // Rodrigues rotation of v by (cosA, sinA) about unit axis k. sgn = +1 forward,
    // -1 for the inverse rotation (negate the sin term).
    vec3 jl_rot(vec3 v, vec3 k, float cA, float sA, float sgn) {
        return v*cA + sgn*cross(k, v)*sA + k*dot(k, v)*(1.0 - cA);
    }

    void formula_Julia3DLattes(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 zz = z.xyz;
        float r2 = dot(zz, zz);
        float r = sqrt(max(r2, 1e-20));

        // Quadratic derivative (amoser): dz = 2·r·dz.
        dr = 2.0 * r * dr;

        // Project to the unit sphere.
        vec3 p = zz / r;

        // ── Align-to-c (uParamB) ──────────────────────────────────────────────
        // The fold below carries D4 symmetry about the x-axis; its y=−z seam is
        // invisible only when c sits on that symmetry (c on the x-axis). To make
        // off-axis c work, conjugate the whole sphere map by a fixed rotation R
        // taking ĉ → x̂: apply R before the fold, R⁻¹ after — so the fold's
        // symmetry (and its seam) is carried onto c's own axis, where the same
        // on-axis logic applies. H(z) = c + r²·R⁻¹·Φ(R·z/r).
        bool aligned = false;
        vec3 kAx = vec3(0.0, 1.0, 0.0); float cA = 1.0, sA = 0.0;
        if (uParamB > 0.5) {
            vec3 ch = c.xyz;
            float cl = length(ch);
            if (cl > 1e-6) {
                ch /= cl;
                // Align ĉ to the NEAREST x-pole (±x̂), not always +x̂ — otherwise
                // c near −x̂ (the basilica) needs a ~180° flip the instant it
                // leaves the axis, popping into a different set. Nearest-pole
                // makes the rotation ≤90° and continuous through the axis.
                vec3 target = vec3(ch.x >= 0.0 ? 1.0 : -1.0, 0.0, 0.0);
                vec3 cr = cross(ch, target);
                float crl = length(cr);
                if (crl > 1e-6) {                 // off-axis: rotate ĉ → ±x̂
                    kAx = cr / crl; cA = clamp(dot(ch, target), -1.0, 1.0); sA = crl; aligned = true;
                }                                  // ĉ on the x-axis: no-op.
            }
        }
        if (aligned) p = jl_rot(p, kAx, cA, sA, 1.0);

        // Fold (uParamA): 0 = none, 1 = amoser's 45° fold (seamed off-axis),
        // 2 = dihedral double-fold (continuous; on-axis-identical to amoser;
        // off-axis burning-ship-class — see header).
        if (uParamA > 1.5) {
            if (p.z > p.y)  { p.yz = p.zy; }     // fold across y=z
            if (p.z < -p.y) { p.yz = -p.zy; }    // fold across y=−z
        } else if (uParamA > 0.5 && abs(p.z) > abs(p.y)) { p.yz = p.zy; }

        // Stereographic projection to ℂ (guard the north pole p.z → 1).
        vec2 w = p.xy / (1.0 - p.z + 1e-9);

        // Lattès step  w → (w² + i)/(1 + i·w²) = M(w²), M a 90° x-rotation.
        vec2 w2 = vec2(w.x*w.x - w.y*w.y, 2.0*w.x*w.y);
        vec2 num = w2 + vec2(0.0, 1.0);                  // w² + i
        vec2 den = vec2(1.0, 0.0) + vec2(-w2.y, w2.x);   // 1 + i·w²
        vec2 res = jl_cdiv(num, den);

        // Inverse stereographic projection back to the unit sphere.
        float u2v2 = dot(res, res);
        vec3 np = vec3(2.0*res.x, 2.0*res.y, u2v2 - 1.0) / (u2v2 + 1.0);

        // Un-align: rotate back by R⁻¹.
        if (aligned) np = jl_rot(np, kAx, cA, sA, -1.0);

        // Radial scaling r² + Julia constant.
        zz = c.xyz + np * r2;

        z.xyz = zz;
        trap = min(trap, min(min(abs(zz.x), abs(zz.y)), abs(zz.z)));
    }`,
        loopBody: `formula_Julia3DLattes(z, dr, trap, c);`,
        // amoser's once-applied per-plane post-rotations (framing), via vec3B.
        loopInit: `
        { float a = uVec3B.x; float s = sin(a), co = cos(a); vec2 t = z.xy; z.x = co*t.x - s*t.y; z.y = s*t.x + co*t.y; }
        { float a = uVec3B.y; float s = sin(a), co = cos(a); vec2 t = z.yz; z.y = co*t.x - s*t.y; z.z = s*t.x + co*t.y; }
        { float a = uVec3B.z; float s = sin(a), co = cos(a); vec2 t = z.xz; z.x = co*t.x - s*t.y; z.z = s*t.x + co*t.y; }
        `,
        // amoser's analytic DE: 0.2·log(r²)·r / dz.
        getDist: `
            float d = 0.2 * log(max(r*r, 1e-10)) * r / max(dr, 1e-9);
            return vec2(d, iter);
        `,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Sym Fold', id: 'paramA', min: 0, max: 2, step: 1, default: 1, options: [
            { label: 'Off (no fold)', value: 0 },
            { label: 'amoser 45° (off-axis seams)', value: 1 },
            { label: 'Dihedral (continuous, BS-class)', value: 2 },
        ] },
        // NOTE: this only ROTATES the on-axis set to point along c (the off-axis
        // map is conjugate to the on-axis one with |c|) — it does NOT produce a
        // genuinely new off-axis Julia set. Seam-free but degenerate. Default off.
        { label: 'Aim set along c', id: 'paramB', min: 0, max: 1, step: 1, default: 0, options: [
            { label: 'Off (true map; off-axis seams)', value: 0 },
            { label: 'On (rotate on-axis set to c)', value: 1 },
        ] },
        { label: 'Post-Rotation', id: 'vec3B', type: 'vec3', min: -3.14159, max: 3.14159, step: 0.001, default: { x: 0, y: 0, z: 0 }, scale: 'pi', mode: 'axes' },
    ],

    defaultPreset: {
        formula: 'Julia3DLattes',
        features: {
            coreMath: {
                iterations: 28,
                paramA: 1,
                paramB: 0,
                vec3B: { x: 0, y: 0, z: 0 },
            },
            // x-axis Julia constant (the regime amoser's fold is faithful for).
            geometry: { juliaMode: true, juliaX: -1.0, juliaY: 0, juliaZ: 0 },
            quality: {
                detail: 3,
                pixelThreshold: 0.4,
                maxSteps: 500,
                fudgeFactor: 0.7,
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
