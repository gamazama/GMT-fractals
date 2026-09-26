import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// THE ZORICH–MAYER QUADRATIC FAMILY IN ℝ³ — "z²-like behavior in 3D" done with
// matched expansion, the sharpest candidate so far for the truly-3D quadratic
// Julia/Mandelbrot program (Kučera Bridges 2019 / amoser).
//
// WHY THIS MAP: for H = c + rⁿ·Φ(w/r) to behave like zⁿ, the angular map Φ must
// expand LENGTHS by n to match the radial log-expansion n — otherwise the
// distortion of Hᵏ grows without bound (not uniformly quasiregular) and, very
// concretely, the standard escape DE (which tracks only the radial derivative
// n·r·dr) is wrong. A degree-2 sphere map expands areas ×2 ⟹ lengths ×√2 ≠ 2:
// STRUCTURALLY unable to be z²-like — that mismatch (not set geometry) is what
// made the bare Möbius-Lattès render as a DE-collapsed "balloon". The correct
// angular object doubles BOTH sphere dimensions: a degree-n² branched cover
// with expansion n — the multiplication-by-n map of the FLAT SQUARE PILLOWCASE
// (ℝ²/⟨integer-mirror reflections⟩ ≅ S², the (2,2,2,2) lattice orbifold). This
// is exactly the angular part of the Zorich power map f = Z∘(n·)∘Z⁻¹, which is
// uniformly quasiregular with |f(x)| = |x|ⁿ (Mayer's construction) — honest
// Fatou/Julia theory applies to f + c. Lattice symmetry is load-bearing here
// (amoser's intuition); the REFLECTION tiling admits every n ≥ 2 including 2,
// unlike rotation-type flat orbifolds (Borromean-axes style, half-integer axis
// offsets) which only admit odd multipliers.
//
// CONSTRUCTION: h: ℝ² → S² is the automorphic square chart — unit squares map
// to hemispheres (concentric-squares → latitude circles, linear perimeter
// angle; square center → pole, boundary → equator), extended across integer
// mirrors with a hemisphere flip. Φ(p) = h(n·h⁻¹(p)). Probe-verified
// (h:\tmp\zorich_quadratic.mjs): h∘h⁻¹ ~ 1e-15; Φ globally continuous
// (Lipschitz 4.46); sense-preserving (0/20000 orientation flips ⟹ genuinely
// NOT a fold/burning-ship-class map); topological degree 4 (n=2). The equator
// mirror σ acts equivariantly (Φ∘σ = σ∘Φ, deck-style like z̄-conjugation), so
// sets for equatorial c are σ-symmetric, and the family is honest quadratic
// class: parameter-space scans (c = z) show connected Mandelbrot-like bodies
// in both the equatorial and meridian planes.
//
// The four pillowcase corners (images of the ℤ² lattice points, on the equator
// at azimuths 45°/135°/225°/315°) are the branch points — the "lattice
// grammar" of the family. The chart is bi-Lipschitz, not conformal: the map is
// quasiregular, not rational — which is exactly the loophole left open by the
// two obstructions (continuous fold-invariant ⟹ degree 0; continuous
// piecewise-Möbius cover of S² ⟹ impossible). See plans/julia3d-offaxis-notes.md.
export const Julia3DZorich: FractalDefinition = {
    id: 'Julia3DZorich',
    name: 'Julia 3D Zorich (pillowcase)',
    shortDescription: 'Zorich–Mayer quadratic family: |x|ⁿ times the degree-n² pillowcase-lattice cover of the sphere — matched-expansion (UQR-style) zⁿ-analogue in 3D.',
    description: 'The Zorich–Mayer power-map family in ℝ³: H = c + rⁿ·Φ(w/r), where Φ is multiplication-by-n on the flat square pillowcase (ℝ² mod integer-mirror reflections ≅ S²) — a degree-n² branched cover expanding lengths by n, matching the radial log-expansion. That matched (uniformly quasiregular) coupling is what a degree-2 sphere map can never provide (√2 ≠ 2), and is the structural requirement for genuine zⁿ-like dynamics in 3D: honest escape structure, valid distance estimation, quadratic-class Julia sets and a connected Mandelbrot-type parameter body (turn Julia mode off ⇒ c = z) — for arbitrary c ∈ ℝ³, no seams, no folds. Lattice symmetry supplies the fractal grammar: the four pillowcase corners on the equator are the branch points.',
    juliaType: 'julia',
    tags: ['julia', 'zorich', 'quasiregular', 'lattice', 'quadratic', 'pillowcase'],

    shader: {
        function: `
    // perimeter angle on the square ring (LINEAR convention, matches inverse)
    float zq_theta(vec2 v) {
        if (abs(v.x) >= abs(v.y)) {
            float t = 0.7853981634 * (v.y / (abs(v.x) < 1e-30 ? 1e-30 : v.x));
            return v.x > 0.0 ? t : 3.1415926536 + t;
        } else {
            float t = 0.7853981634 * (v.x / v.y);
            return v.y > 0.0 ? 1.5707963268 - t : 4.7123889804 - t;
        }
    }
    vec2 zq_invTheta(float th, float s) {
        float t = mod(th, 6.2831853072);
        if (t >= 5.4977871438) t -= 6.2831853072;
        float Q = 0.7853981634;
        if (t < Q)       return vec2(s, s * (t / Q));
        if (t < 3.0 * Q) return vec2(s * ((1.5707963268 - t) / Q), s);
        if (t < 5.0 * Q) return vec2(-s, -s * ((t - 3.1415926536) / Q));
        return vec2(-s * ((4.7123889804 - t) / Q), -s);
    }
    // automorphic square chart: squares -> hemispheres, mirror flip across grid
    vec3 zq_h(vec2 u) {
        vec2 m = floor(u);
        vec2 w = u - m;
        if (mod(m.x, 2.0) >= 1.0) w.x = 1.0 - w.x;
        if (mod(m.y, 2.0) >= 1.0) w.y = 1.0 - w.y;
        vec2 v = 2.0 * w - 1.0;
        float s = max(abs(v.x), abs(v.y));
        vec3 p;
        if (s < 1e-9) { p = vec3(0.0, 0.0, 1.0); }
        else {
            float th = zq_theta(v);
            float phi = s * 1.5707963268;
            p = vec3(sin(phi) * cos(th), sin(phi) * sin(th), cos(phi));
        }
        if (mod(m.x + m.y, 2.0) >= 1.0) p.z = -p.z;
        return p;
    }
    vec2 zq_hinv(vec3 p) {
        bool up = p.z >= 0.0;
        vec3 q = up ? p : vec3(p.xy, -p.z);
        float phi = acos(clamp(q.z, -1.0, 1.0));
        float s = phi / 1.5707963268;
        vec2 v = (s < 1e-9) ? vec2(0.0) : zq_invTheta(atan(q.y, q.x), s);
        vec2 w = (v + 1.0) * 0.5;
        return up ? w : vec2(-w.x, w.y);   // lower hemisphere: odd-parity branch
    }

    void formula_Julia3DZorich(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 zz = z.xyz;
        float r = max(length(zz), 1e-12);
        float n = clamp(uParamA, 2.0, 4.0);

        // matched expansion: radial r -> r^n, angular multiplication-by-n
        dr = n * pow(r, n - 1.0) * dr;

        vec3 p = zz / r;
        vec3 np = zq_h(n * zq_hinv(p));

        zz = c.xyz + np * pow(r, n);

        z.xyz = zz;
        trap = min(trap, min(min(abs(zz.x), abs(zz.y)), abs(zz.z)));
    }`,
        loopBody: `formula_Julia3DZorich(z, dr, trap, c);`,
        getDist: `
            float d = 0.2 * log(max(r*r, 1e-10)) * r / max(dr, 1e-9);
            return vec2(d, iter);
        `,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Power n', id: 'paramA', min: 2, max: 4, step: 1, default: 2, options: [
            { label: 'n = 2 (quadratic)', value: 2 },
            { label: 'n = 3 (cubic)', value: 3 },
            { label: 'n = 4 (quartic)', value: 4 },
        ] },
    ],

    defaultPreset: {
        formula: 'Julia3DZorich',
        features: {
            coreMath: {
                iterations: 30,
                paramA: 2,
            },
            // interior-adjacent equatorial c from the probe's M-scan
            geometry: { juliaMode: true, juliaX: -0.75, juliaY: -0.55, juliaZ: 0 },
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
